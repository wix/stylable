import { plugableRecord } from '../helpers/plugable-record';
import { FeatureContext, createFeature } from './feature';
import type { StylableMeta } from '../stylable-meta';
import * as STSymbol from './st-symbol';
import * as STCustomSelector from './st-custom-selector';
import * as STCustomState from './st-custom-state';
import type { MappedStates } from './st-custom-state';
import * as CSSClass from './css-class';
import { warnOnce } from '../helpers/deprecation';
import postcss from 'postcss';
import { parseCSSValue, stringifyCSSValue, BaseAstNode } from '@tokey/css-value-parser';
import { parseSelectorWithCache } from '../helpers/selector';
import { ImmutableSelector, stringifySelectorAst } from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';
import { getAlias } from '../stylable-utils';
import {
    findAnything,
    findFatArrow,
    findNextClassNode,
    findNextPseudoClassNode,
    findPseudoElementNode,
} from '../helpers/css-value-seeker';
import type { ImmutableSelectorList } from '@tokey/css-selector-parser';

export const diagnostics = {
    GLOBAL_MAPPING_LIMITATION: createDiagnosticReporter(
        '21000',
        'error',
        () => `Currently class mapping is limited to single global selector: :global(<selector>)`
    ),
    UNSUPPORTED_TOP_DEF: createDiagnosticReporter(
        '21001',
        'error',
        () => 'top level @st must start with a class'
    ),
    MISSING_EXTEND: createDiagnosticReporter(
        '21002',
        'error',
        () => `missing required class reference to extend a class (e.g. ":is(.class-name)"`
    ),
    OVERRIDE_IMPORTED_CLASS: createDiagnosticReporter(
        '21003',
        'error',
        () => `cannot override imported class definition`
    ),
    STATE_OUT_OF_CONTEXT: createDiagnosticReporter(
        '21004',
        'error',
        () => 'pseudo-state definition must be directly nested in a `@st .class{}` definition'
    ),
    REDECLARE_STATE: createDiagnosticReporter(
        '21005',
        'error',
        (name: string) => `state "${name}" is already declared`
    ),
    MISSING_MAPPED_SELECTOR: createDiagnosticReporter(
        '21006',
        'error',
        () => `missing mapped selector after "=>"`
    ),
    MULTI_MAPPED_SELECTOR: createDiagnosticReporter(
        '21007',
        'error',
        () => `mapped selector accepts only a single selector`
    ),
    ELEMENT_OUT_OF_CONTEXT: createDiagnosticReporter(
        '21008',
        'error',
        () => 'pseudo-element definition must be directly nested in a `@st .class{}` definition'
    ),
    MISSING_MAPPING: createDiagnosticReporter(
        '21009',
        'error',
        () => 'expected selector mapping (e.g. "=> <selector>")'
    ),
    REDECLARE: createDiagnosticReporter(
        '21010',
        'error',
        (type: string, src: string) => `redeclare ${type} definition: "${src}"`
    ),
    INVALID_ST_DEF: createDiagnosticReporter(
        '21011',
        'error',
        (params: string) => `invalid @st "${params}" definition`
    ),
};

export interface PartSymbol extends HasParts, STCustomState.HasStates {
    _kind: 'part';
    name: string;
    id: string;
    mapTo: ImmutableSelectorList | CSSClass.ClassSymbol;
}
export interface HasParts {
    '-st-parts': Record<string, PartSymbol>;
}

export const experimentalMsg = '[experimental feature] stylable structure (@st): API might change!';

const dataKey = plugableRecord.key<{
    isStructureMode: boolean;
    analyzedDefs: WeakMap<postcss.AtRule, AnalyzedStDef>;
    analyzedDefToPartSymbol: Map<AnalyzedStDef, PartSymbol>;
}>('st-structure');

// HOOKS

export const hooks = createFeature({
    analyzeInit(context) {
        const { meta } = context;
        const stAtRule = meta.sourceAst.nodes.find((node) => isStAtRule(node));
        if (stAtRule) {
            warnOnce(experimentalMsg);
            const metaAnalysis = plugableRecord.getUnsafe(context.meta.data, dataKey);
            metaAnalysis.isStructureMode = true;
        } else if (meta.type === 'stylable') {
            // set implicit root for legacy mode (root with flat structure)
            meta.root = 'root';
            const rootSymbol = CSSClass.addClass(context, 'root');
            rootSymbol[`-st-root`] = true;
        }
    },
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {
            // default to legacy flat mode
            isStructureMode: false,
            analyzedDefs: new WeakMap(),
            analyzedDefToPartSymbol: new Map(),
        });
    },
    analyzeAtRule({ context, atRule, analyzeRule }) {
        if (!isStAtRule(atRule)) {
            return;
        }

        const { analyzedDefToPartSymbol } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        const analyzed = analyzeStAtRule(atRule, context);
        if (!analyzed) {
            if (atRule.parent?.type === 'root') {
                context.diagnostics.report(diagnostics.UNSUPPORTED_TOP_DEF(), {
                    node: atRule,
                });
            } else {
                context.diagnostics.report(diagnostics.INVALID_ST_DEF(atRule.params), {
                    node: atRule,
                });
            }
        } else if (analyzed.type === 'topLevelClass') {
            // ToDo: error when nested (only top level for now)
            if (!analyzed.name) {
                context.diagnostics.report(diagnostics.UNSUPPORTED_TOP_DEF(), {
                    node: atRule,
                });
            }
            const existingSymbol = STSymbol.get(context.meta, analyzed.name);
            if (existingSymbol?._kind === 'import') {
                context.diagnostics.report(diagnostics.OVERRIDE_IMPORTED_CLASS(), {
                    node: atRule,
                });
                return;
            }
            // ToDo: pass atuRule for diagnostics
            CSSClass.addClass(context, analyzed.name /*, atRule*/);
            // extend class
            if (analyzed.extendedClass) {
                const extendedSymbol =
                    CSSClass.get(context.meta, analyzed.extendedClass) ||
                    CSSClass.addClass(context, analyzed.extendedClass);
                CSSClass.extendTypedRule(
                    context,
                    atRule,
                    '.' + analyzed.name,
                    '-st-extends',
                    getAlias(extendedSymbol) || extendedSymbol
                );
            }
            // class mapping
            if (analyzed.mappedSelector) {
                const firstSelectorNodes = analyzed.mappedSelector.nodes;
                if (
                    firstSelectorNodes[0].type !== 'pseudo_class' ||
                    firstSelectorNodes[0].value !== 'global' ||
                    firstSelectorNodes[0].nodes?.length !== 1
                ) {
                    // ToDo: support non global mapping
                    context.diagnostics.report(diagnostics.GLOBAL_MAPPING_LIMITATION(), {
                        node: atRule,
                        word: stringifySelectorAst(firstSelectorNodes[0]),
                    });
                } else {
                    const mappedSelectorAst = firstSelectorNodes[0].nodes[0];
                    // analyze mapped selector
                    analyzeRule(
                        postcss.rule({
                            selector: stringifySelectorAst(mappedSelectorAst),
                            source: atRule.source,
                        }),
                        {
                            isScoped: false,
                            originalNode: atRule,
                        }
                    );
                    // register global mapping to class
                    CSSClass.extendTypedRule(
                        context,
                        atRule,
                        analyzed.name,
                        '-st-global',
                        mappedSelectorAst.nodes
                    );
                }
            }
        } else if (analyzed.type === 'part') {
            const parentSymbol =
                analyzed.parentAnalyze.type === 'topLevelClass'
                    ? CSSClass.get(context.meta, analyzed.parentAnalyze.name)
                    : analyzedDefToPartSymbol.get(analyzed.parentAnalyze);

            if (!parentSymbol) {
                // assuming analyzing @st definitions dfs - class/part must be defined
                return;
            }
            const partName = analyzed.name;
            // check re-declare
            if (getPart(parentSymbol, partName)) {
                const srcWord = '::' + partName;
                context.diagnostics.report(diagnostics.REDECLARE('pseudo-element', srcWord), {
                    node: atRule,
                    word: srcWord,
                });
                return;
            }
            // analyze mapped selector
            analyzeRule(
                postcss.rule({
                    selector: stringifySelectorAst(analyzed.mappedSelector),
                    source: atRule.source,
                }),
                {
                    isScoped: false,
                    originalNode: atRule,
                }
            );
            // register part mapping to parent definition
            const partSymbol = setPart(parentSymbol, getSymbolId(parentSymbol), partName, [
                analyzed.mappedSelector,
            ]);
            analyzedDefToPartSymbol.set(analyzed, partSymbol);
        } else if (analyzed.type === 'state') {
            const parentSymbol =
                analyzed.parentAnalyze.type === 'topLevelClass'
                    ? CSSClass.get(context.meta, analyzed.parentAnalyze.name)
                    : analyzedDefToPartSymbol.get(analyzed.parentAnalyze);
            if (!parentSymbol) {
                // assuming analyzing @st definitions dfs - class/part must be defined
                return;
            }
            const mappedStates = (parentSymbol['-st-states'] ||= {});
            const stateName = analyzed.name;
            if (mappedStates[stateName]) {
                // first state definition wins
                context.diagnostics.report(diagnostics.REDECLARE_STATE(stateName), {
                    node: atRule,
                    word: ':' + stateName,
                });
                return;
            }
            mappedStates[stateName] = analyzed.stateDef;
        }
    },
    analyzeDone({ meta }) {
        const { isStructureMode } = plugableRecord.getUnsafe(meta.data, dataKey);
        if (meta.type === 'stylable' && !isStructureMode) {
            // legacy flat mode:
            //  classes and custom-selectors are registered as .root pseudo-elements
            const customSelectors = STCustomSelector.getCustomSelectors(meta);
            const classes = CSSClass.getAll(meta);
            const rootClass = classes['root']!;
            const rootId = getSymbolId(rootClass);
            // custom-selector definition precedence over class definition
            for (const [partName, { mapTo }] of Object.entries(customSelectors)) {
                setPart(rootClass, rootId, partName, mapTo);
            }
            for (const [className, classSymbol] of Object.entries(classes)) {
                if (className === 'root' || customSelectors[className]) {
                    continue;
                }
                setPart(rootClass, rootId, className, classSymbol);
            }
        }
    },
});

// API

function isStAtRule(node: postcss.AnyNode): node is postcss.AtRule {
    return node?.type === 'atrule' && node.name === 'st';
}

export function isStructureMode(meta: StylableMeta) {
    return plugableRecord.getUnsafe(meta.data, dataKey).isStructureMode;
}

export function createPartSymbol(
    input: Partial<PartSymbol> & Pick<PartSymbol, 'name' | 'id' | 'mapTo'>
): PartSymbol {
    const parts = input['-st-parts'] || {};
    const states = input['-st-states'] || {};
    return { ...input, _kind: 'part', '-st-parts': parts, '-st-states': states };
}

export function setPart(
    symbol: HasParts,
    parentId: string,
    partName: string,
    mapTo: PartSymbol['mapTo']
) {
    const partSymbol = createPartSymbol({
        name: partName,
        id: parentId + '::' + partName,
        mapTo,
    });
    symbol['-st-parts'][partName] = partSymbol;
    return partSymbol;
}

export function getParts(symbol: HasParts) {
    return symbol['-st-parts'];
}

export function getPart(symbol: HasParts, name: string): PartSymbol | undefined {
    return symbol['-st-parts'][name];
}

export function getPartNames(symbol: HasParts) {
    return Object.keys(symbol['-st-parts']);
}

function getSymbolId(symbol: CSSClass.ClassSymbol | PartSymbol) {
    return symbol._kind === 'class' ? '.' + symbol.name : symbol.id;
}

interface ParsedStClass {
    type: 'topLevelClass';
    name: string;
    extendedClass?: string;
    mappedSelector?: ImmutableSelector;
}

interface ParsedStPart {
    type: 'part';
    name: string;
    parentAnalyze: ParsedStClass | ParsedStPart;
    mappedSelector: ImmutableSelector;
}

interface ParsedStState {
    type: 'state';
    name: string;
    parentAnalyze: ParsedStClass | ParsedStPart;
    stateDef: MappedStates[string];
}

type AnalyzedStDef = undefined | ParsedStClass | ParsedStPart | ParsedStState;
function analyzeStAtRule(atRule: postcss.AtRule, context: FeatureContext): AnalyzedStDef {
    // cache
    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    if (analyzedDefs.has(atRule)) {
        return analyzedDefs.get(atRule);
    }

    const params = parseCSSValue(atRule.params);

    if (params.length === 0) {
        return;
    }

    const analyzedDef =
        parseClassDefinition(context, atRule, params) ||
        parsePseudoElementDefinition(context, atRule, params) ||
        parseStateDefinition(context, atRule, params);
    if (analyzedDef) {
        analyzedDefs.set(atRule, analyzedDef);
    }

    return analyzedDef;
}

function parseStateDefinition(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[]
): ParsedStState | undefined {
    const [amountToName, nameNode] = findNextPseudoClassNode(params, 0);
    if (!nameNode) {
        return;
    }
    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    const parentRule = atRule.parent;
    const parentAnalyze = parentRule && analyzedDefs.get(parentRule as any);
    if (parentAnalyze?.type !== 'topLevelClass' && parentAnalyze?.type !== 'part') {
        context.diagnostics.report(diagnostics.STATE_OUT_OF_CONTEXT(), {
            node: atRule,
        });
        return;
    }
    const parsedDef = STCustomState.parseStateValue(
        params.slice(amountToName - 1),
        atRule,
        context.diagnostics
    );
    if (parsedDef === undefined) {
        // diagnostics are reported from within parseStateValue()
        return;
    }
    return {
        type: 'state',
        name: nameNode.value,
        stateDef: parsedDef,
        parentAnalyze,
    };
}

function parsePseudoElementDefinition(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[]
): ParsedStPart | undefined {
    let index = 0;
    // collect pseudo element name
    const [amountToName, nameNode] = findPseudoElementNode(params, 0);
    if (!nameNode) {
        return;
    }
    index += amountToName;
    // get symbol to extend
    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    const parentRule = atRule.parent;
    const parentAnalyze = parentRule && analyzedDefs.get(parentRule as any);
    if (parentAnalyze?.type !== 'topLevelClass' && parentAnalyze?.type !== 'part') {
        context.diagnostics.report(diagnostics.ELEMENT_OUT_OF_CONTEXT(), {
            node: atRule,
        });
        return;
    }
    // collect mapped selector
    const [amountUntilSelector, mappedSelector] = parseMapping(context, atRule, params, index);
    if (!mappedSelector) {
        context.diagnostics.report(diagnostics.MISSING_MAPPING(), {
            node: atRule,
        });
        return;
    }
    index += amountUntilSelector;
    // check unexpected extra
    const [amountToUnexpectedNode] = findAnything(params, index);
    if (amountToUnexpectedNode) {
        // ToDo: report unexpected extra syntax
        return;
    }

    return {
        type: 'part',
        name: nameNode.value,
        parentAnalyze,
        mappedSelector,
    };
}

function parseClassDefinition(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[]
): ParsedStClass | undefined {
    let index = 0;

    const [amountToClass, classNameNode] = findNextClassNode(params, index, { stopOnFail: true });
    if (!classNameNode) {
        return;
    }
    const result: AnalyzedStDef = { type: 'topLevelClass', name: '' };
    // top level class
    index += amountToClass;
    result.name = classNameNode.value;
    // collect extends class
    const [amountToExtends, extendsNode] = findNextPseudoClassNode(params, index, {
        name: 'is',
        stopOnFail: true,
        stopOnMatch: (_node, index, nodes) => {
            const [amountToFatArrow] = findFatArrow(nodes, index, { stopOnFail: true });
            return amountToFatArrow > 0;
        },
    });
    if (extendsNode) {
        index += amountToExtends;
        if (extendsNode.type === 'call') {
            const [amountToExtendedClass, nameNode] = findNextClassNode(extendsNode.args, 0, {
                stopOnFail: true,
            });
            if (amountToExtendedClass) {
                index += amountToExtends;
                // check leftover nodes
                const [amountToUnexpectedNode] = findAnything(
                    extendsNode.args,
                    amountToExtendedClass
                );
                if (!amountToUnexpectedNode) {
                    result.extendedClass = nameNode!.value;
                }
            }
        }
        if (!result.extendedClass) {
            context.diagnostics.report(diagnostics.MISSING_EXTEND(), {
                node: atRule,
                word: stringifyCSSValue(extendsNode),
            });
        }
    }
    // collect mapped selector
    const [amountUntilSelector, mappedSelector] = parseMapping(context, atRule, params, index);
    result.mappedSelector = mappedSelector;
    index += amountUntilSelector;
    // check unexpected extra
    const [amountToUnexpectedNode] = findAnything(params, index);
    if (amountToUnexpectedNode) {
        // ToDo: report unexpected extra syntax
        return;
    }
    if (result.name) {
        return result;
    }
    return;
}

function parseMapping(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[],
    startIndex: number
): [takenNodeAmount: number, mappedSelector: ImmutableSelector | undefined] {
    let index = startIndex;
    const [amountToMapping, mappingOpenNode] = findFatArrow(params, startIndex, {
        stopOnFail: false,
    });
    if (amountToMapping) {
        index += amountToMapping;
        const selectorStr = atRule.params.slice(mappingOpenNode!.end);
        const mappedSelectors = parseSelectorWithCache(selectorStr);
        switch (mappedSelectors.length) {
            case 1:
                return [index + selectorStr.length, mappedSelectors[0]];
            case 0:
                context.diagnostics.report(diagnostics.MISSING_MAPPED_SELECTOR(), {
                    node: atRule,
                });
                break;
            default:
                context.diagnostics.report(diagnostics.MULTI_MAPPED_SELECTOR(), {
                    node: atRule,
                });
        }
    }
    return [0, undefined];
}
