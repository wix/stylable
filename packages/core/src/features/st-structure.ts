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
import { parseSelectorWithCache, walkSelector } from '../helpers/selector';
import {
    ImmutableSelector,
    stringifySelectorAst,
    ImmutablePseudoClass,
    ImmutableSelectorList,
} from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';
import { getAlias } from '../stylable-utils';
import {
    findAnything,
    findFatArrow,
    findNextClassNode,
    findNextPseudoClassNode,
    findPseudoElementNode,
    isExactLiteral,
} from '../helpers/css-value-seeker';

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
    // 31005 - unused
    MISSING_MAPPED_SELECTOR: createDiagnosticReporter(
        '21006',
        'error',
        () => `missing mapped selector after "=>"`
    ),
    MULTI_MAPPED_SELECTOR: createDiagnosticReporter(
        '21007',
        'error',
        () =>
            'mapped selector accepts only a single selector.\nuse `:is()` or `:where()` to map multiple selectors)'
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
    MAPPING_UNSUPPORTED_NESTING: createDiagnosticReporter(
        '21012',
        'error',
        () => 'mapped selector can only contain `&` as an initial selector'
    ),
    UNEXPECTED_EXTRA_VALUE: createDiagnosticReporter(
        '21013',
        'error',
        (extraValue: string) => `found unexpected extra value definition: "${extraValue}"`
    ),
    CLASS_OUT_OF_CONTEXT: createDiagnosticReporter(
        '21014',
        'error',
        () => 'class definition must be top level'
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
    declaredClasses: Set<string>;
}>('st-structure');

// HOOKS

export const hooks = createFeature({
    analyzeInit(context) {
        const { meta } = context;
        if (meta.type !== 'stylable') {
            return;
        }
        const stAtRule = meta.sourceAst.nodes.find((node) => isStAtRule(node));
        if (stAtRule) {
            warnOnce(experimentalMsg);
            const metaAnalysis = plugableRecord.getUnsafe(context.meta.data, dataKey);
            metaAnalysis.isStructureMode = true;
        } else {
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
            declaredClasses: new Set<string>(),
        });
    },
    analyzeAtRule({ context, atRule, analyzeRule }) {
        if (!isStAtRule(atRule) || context.meta.type !== 'stylable') {
            return;
        }

        const { analyzedDefToPartSymbol, declaredClasses } = plugableRecord.getUnsafe(
            context.meta.data,
            dataKey
        );
        const analyzed = analyzeStAtRule(atRule, context);
        if (!analyzed) {
            // not valid
        } else if (analyzed.type === 'topLevelClass') {
            declaredClasses.add(analyzed.name);
            CSSClass.addClass(context, analyzed.name, atRule);
            CSSClass.disableDirectivesForClass(context, analyzed.name);
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
                // ToDo: support non global mapping
                const globalNode = findGlobalPseudo(analyzed);
                if (globalNode && globalNode.nodes?.length === 1) {
                    const mappedSelectorAst = globalNode.nodes[0];
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
            const parentSymbol = getPartParentSymbol(context, analyzed, analyzedDefToPartSymbol);
            if (!parentSymbol) {
                // unreachable: assuming analyzing @st definitions dfs - class/part must be defined
                context.diagnostics.report(diagnostics.ELEMENT_OUT_OF_CONTEXT(), {
                    node: atRule,
                });
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
                    isScoped: true,
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
                // unreachable: assuming analyzing @st definitions dfs - class/part must be defined
                context.diagnostics.report(diagnostics.STATE_OUT_OF_CONTEXT(), {
                    node: atRule,
                });
                return;
            }
            const mappedStates = (parentSymbol['-st-states'] ||= {});
            const stateName = analyzed.name;
            if (mappedStates[stateName]) {
                // first state definition wins
                const srcWord = ':' + stateName;
                context.diagnostics.report(diagnostics.REDECLARE('pseudo-state', srcWord), {
                    node: atRule,
                    word: srcWord,
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
            for (const [partName, mapTo] of Object.entries(customSelectors)) {
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

function getPartParentSymbol(
    context: FeatureContext,
    { parentAnalyze }: ParsedStPart,
    analyzedDefToPartSymbol: Map<AnalyzedStDef, PartSymbol>
) {
    return parentAnalyze.type === 'topLevelClass'
        ? CSSClass.get(context.meta, parentAnalyze.name)
        : analyzedDefToPartSymbol.get(parentAnalyze);
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

type ParsedStClass = {
    type: 'topLevelClass';
    params: BaseAstNode[];
    match: boolean;
    ranges: Record<'class' | 'extend' | 'mapArrow' | 'mapTo' | 'leftoverValue', BaseAstNode[]>;
    name: string;
    extendedClass?: string;
    mappedSelector?: ImmutableSelector;
};

interface ParsedStPart {
    type: 'part';
    params: BaseAstNode[];
    match: boolean;
    ranges: Record<'pseudoElement' | 'mapArrow' | 'mapTo' | 'leftoverValue', BaseAstNode[]>;
    name: string;
    parentAnalyze: ParsedStClass | ParsedStPart;
    mappedArrow: boolean;
    mappedSelector: ImmutableSelector;
}

interface ParsedStState {
    type: 'state';
    params: BaseAstNode[];
    match: boolean;
    ranges: Record<'leftoverValue', BaseAstNode[]>;
    name: string;
    parentAnalyze: ParsedStClass | ParsedStPart;
    stateDef: MappedStates[string];
}

function isMatch(result: any): result is AnalyzedStDef {
    return result.match;
}

type AnalyzedStDef = ParsedStClass | ParsedStPart | ParsedStState;
function analyzeStAtRule(
    atRule: postcss.AtRule,
    context: FeatureContext
): AnalyzedStDef | undefined {
    // cache
    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    if (analyzedDefs.has(atRule)) {
        return analyzedDefs.get(atRule);
    }
    // parse
    const params = parseCSSValue(atRuleFullParams(atRule));

    const def =
        params.length === 0
            ? undefined
            : parseClassDefinition(atRule, params) ||
              parsePseudoElementDefinition(context, atRule, params) ||
              parseStateDefinition(context, atRule, params);

    if (!def) {
        if (atRule.parent?.type === 'root') {
            context.diagnostics.report(diagnostics.UNSUPPORTED_TOP_DEF(), {
                node: atRule,
            });
        } else {
            context.diagnostics.report(diagnostics.INVALID_ST_DEF(atRule.params), {
                node: atRule,
            });
        }
        return;
    }

    // validate
    switch (def.type) {
        case 'topLevelClass': {
            if (!validateTopLevelClass({ def, atRule, context })) {
                return;
            }
            break;
        }
        case 'part': {
            if (!validatePart({ def, atRule, context })) {
                return;
            }
            break;
        }
        case 'state': {
            if (!validateState({ def, atRule, context })) {
                return;
            }
            break;
        }
    }
    if (!isMatch(def)) {
        return;
    }

    analyzedDefs.set(atRule, def);
    return def;
}

function validateTopLevelClass({
    def,
    atRule,
    context,
}: {
    def: Partial<ParsedStClass>;
    atRule: postcss.AtRule;
    context: FeatureContext;
}) {
    const { declaredClasses } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    if (!def.ranges || !def.params) {
        // should always be provided by parser
        return false;
    }
    if (!def.name) {
        // ToDo: fix type to have name required
        return false;
    }
    if (def.ranges.extend.length && !def.extendedClass) {
        context.diagnostics.report(diagnostics.MISSING_EXTEND(), {
            node: atRule,
            word: stringifyCSSValue(def.ranges.extend),
        });
    }
    if (def.ranges.leftoverValue.find((node) => node.type !== 'comment' && node.type !== 'space')) {
        const unexpectedValue = stringifyCSSValue(def.ranges.leftoverValue).trim();
        context.diagnostics.report(diagnostics.UNEXPECTED_EXTRA_VALUE(unexpectedValue), {
            node: atRule,
            word: unexpectedValue,
        });
        return false;
    }
    if (atRule.parent?.type !== 'root') {
        context.diagnostics.report(diagnostics.CLASS_OUT_OF_CONTEXT(), {
            node: atRule,
        });
        return false;
    }
    const existingSymbol = STSymbol.get(context.meta, def.name);
    if (existingSymbol?._kind === 'import') {
        context.diagnostics.report(diagnostics.OVERRIDE_IMPORTED_CLASS(), {
            node: atRule,
        });
        return false;
    }
    if (declaredClasses.has(def.name)) {
        // ToDo: use st-symbol redeclare api; improve st-symbol/css-class "final" marking and diagnostics
        const srcWord = '.' + def.name;
        context.diagnostics.report(diagnostics.REDECLARE('class', srcWord), {
            node: atRule,
            word: srcWord,
        });
        return false;
    }
    if (def.ranges.mapArrow.length) {
        if (!def.mappedSelector) {
            // report missing selector
            const arrowEnd = def.ranges.mapArrow[def.ranges.mapArrow.length - 1];
            for (let i = def.params.length - 1; i >= 0; i--) {
                const node = def.params[i];
                if (node === arrowEnd) {
                    break;
                } else if (isExactLiteral(node, ',')) {
                    context.diagnostics.report(diagnostics.MULTI_MAPPED_SELECTOR(), {
                        node: atRule,
                    });
                    return false;
                }
            }
            context.diagnostics.report(diagnostics.MISSING_MAPPED_SELECTOR(), {
                node: atRule,
            });
            return false;
        }
        const globalNode = findGlobalPseudo(def, true);
        if (!globalNode || !globalNode.nodes || globalNode.nodes.length !== 1) {
            context.diagnostics.report(diagnostics.GLOBAL_MAPPING_LIMITATION(), {
                node: atRule,
                word: stringifySelectorAst(def.mappedSelector).trim(),
            });
            return false;
        }
    }
    return true;
}
function validatePart({
    def,
    atRule,
    context,
}: {
    def: Partial<ParsedStPart>;
    atRule: postcss.AtRule;
    context: FeatureContext;
}) {
    if (!def.parentAnalyze) {
        context.diagnostics.report(diagnostics.ELEMENT_OUT_OF_CONTEXT(), {
            node: atRule,
        });
        return false;
    }
    if (!def.mappedSelector) {
        if (!def.mappedArrow) {
            context.diagnostics.report(diagnostics.MISSING_MAPPING(), {
                node: atRule,
            });
            return false;
        }
        // report missing selector
        const arrowEnd = def.ranges!.mapArrow[def.ranges!.mapArrow.length - 1];
        for (let i = def.params!.length - 1; i >= 0; i--) {
            const node = def.params![i];
            if (node === arrowEnd) {
                break;
            } else if (isExactLiteral(node, ',')) {
                context.diagnostics.report(diagnostics.MULTI_MAPPED_SELECTOR(), {
                    node: atRule,
                });
                return false;
            }
        }
        context.diagnostics.report(diagnostics.MISSING_MAPPED_SELECTOR(), {
            node: atRule,
        });
        return false;
    }
    if (validateNestingInMapping(def.mappedSelector, context, atRule)) {
        return false;
    }
    return true;
}
function validateState({
    def,
    atRule,
    context,
}: {
    def: Partial<ParsedStState>;
    atRule: postcss.AtRule;
    context: FeatureContext;
}) {
    if (!def.parentAnalyze) {
        context.diagnostics.report(diagnostics.STATE_OUT_OF_CONTEXT(), {
            node: atRule,
        });
        return false;
    }
    const [amountToActualValue] = findAnything(def.ranges!.leftoverValue, 0);
    if (amountToActualValue) {
        const unexpectedValue = stringifyCSSValue(def.ranges!.leftoverValue).trim();
        context.diagnostics.report(diagnostics.UNEXPECTED_EXTRA_VALUE(unexpectedValue), {
            node: atRule,
            word: unexpectedValue,
        });
        return false;
    }

    return true;
}
function findGlobalPseudo(def: Partial<ParsedStClass>, checkAfter = false) {
    if (!def.mappedSelector) {
        return;
    }
    let globalNode: ImmutablePseudoClass | undefined = undefined;
    let foundUnexpectedSelector = false;
    for (const node of def.mappedSelector.nodes) {
        if (node.type === 'pseudo_class' && node.value === 'global' && !globalNode) {
            globalNode = node;
            if (!checkAfter) {
                break;
            }
        } else if (node.type !== 'comment') {
            foundUnexpectedSelector = true;
        }
    }
    return foundUnexpectedSelector ? undefined : globalNode;
}

function parseStateDefinition(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[]
) {
    const result: Partial<ParsedStState> = {
        type: 'state',
        params,
        match: true,
        ranges: { leftoverValue: [] },
    };

    let index = 0;

    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey); // name
    const [amountToName, nameNode] = findNextPseudoClassNode(params, 0);
    if (nameNode) {
        result.name = nameNode.value;
    } else {
        // not a pseudo-state definition
        return;
    }
    index += amountToName;
    // parent
    const parentRule = atRule.parent;
    const parentAnalyze = parentRule && analyzedDefs.get(parentRule as any);
    if (
        parentAnalyze &&
        (parentAnalyze.type === 'topLevelClass' || parentAnalyze.type === 'part')
    ) {
        result.parentAnalyze = parentAnalyze;
    }
    // state
    const [amountToStateDef, stateDef] = STCustomState.parseStateValue(
        params.slice(index - 1),
        atRule,
        context.diagnostics
    );
    if (stateDef !== undefined) {
        index += amountToStateDef;
        result.stateDef = stateDef;
    } else {
        result.match = false;
    }
    // leftover
    const amountTaken = index - 1;
    result.ranges!.leftoverValue.push(...params.slice(amountTaken));
    const [amountToUnexpected] = findAnything(params, index);
    if (amountToUnexpected) {
        result.match = false;
    }
    return result;
}

function parsePseudoElementDefinition(
    context: FeatureContext,
    atRule: postcss.AtRule,
    params: BaseAstNode[]
) {
    const { analyzedDefs } = plugableRecord.getUnsafe(context.meta.data, dataKey);
    const result: Partial<ParsedStPart> = {
        type: 'part',
        params,
        match: true,
        name: '',
        ranges: { pseudoElement: [], mapArrow: [], mapTo: [], leftoverValue: [] },
    };

    let index = 0;

    // collect pseudo element name
    const [amountToName, nameNode, nameInspectAmount] = findPseudoElementNode(params, 0);
    result.ranges!.pseudoElement.push(...params.slice(index, index + nameInspectAmount));
    index += amountToName;
    if (nameNode) {
        result.name = nameNode.value;
    } else {
        // not a pseudo-element definition
        return false;
    }
    // get symbol to extend
    const parentRule = atRule.parent;
    const parentAnalyze = parentRule && analyzedDefs.get(parentRule as any);
    if (parentAnalyze?.type === 'topLevelClass' || parentAnalyze?.type === 'part') {
        result.parentAnalyze = parentAnalyze;
    }
    // collect mapped selector
    const [amountToMapping, mappingOpenNode, mapArrowInspectAmount] = findFatArrow(params, index, {
        stopOnFail: false,
    });
    result.ranges!.mapArrow.push(...params.slice(index, index + mapArrowInspectAmount));
    index += amountToMapping;
    if (mappingOpenNode) {
        result.mappedArrow = true;
        // selector
        result.ranges!.mapTo.push(...params.slice(index));
        index = params.length - 1;
        const selectorStr = atRuleFullParams(atRule).slice(mappingOpenNode.end);
        const mappedSelectors = parseSelectorWithCache(selectorStr.trim());
        const filteredSelector =
            mappedSelectors.length === 1 && filterCommentsAndSpaces(mappedSelectors[0]);
        if (filteredSelector && filteredSelector.nodes.length) {
            result.mappedSelector = filteredSelector;
        }
    } else {
        result.match = false;
    }
    // check unexpected extra
    result.ranges!.leftoverValue.push(...params.slice(index + 1));

    return result;
}

function parseClassDefinition(atRule: postcss.AtRule, params: BaseAstNode[]) {
    const result: ParsedStClass = {
        type: 'topLevelClass',
        params,
        match: true,
        ranges: { class: [], extend: [], mapArrow: [], mapTo: [], leftoverValue: [] },
        name: '',
    };

    let index = 0;
    // top level class
    const [amountToClass, classNameNode, classInspectedAmount] = findNextClassNode(params, index, {
        stopOnFail: true,
    });
    result.ranges.class.push(...params.slice(index, index + classInspectedAmount));
    index += amountToClass;
    if (classNameNode) {
        result.name = classNameNode.value;
    } else {
        // not a class definition
        return false;
    }
    // collect extends class
    const [amountToExtends, extendsNode, extendInspectAmount] = findNextPseudoClassNode(
        params,
        index,
        {
            name: 'is',
            stopOnFail: true,
            stopOnMatch: (_node, index, nodes) => {
                const [amountToFatArrow] = findFatArrow(nodes, index, { stopOnFail: true });
                return amountToFatArrow > 0;
            },
        }
    );
    if (extendsNode) {
        result.ranges.extend.push(...params.slice(index, index + extendInspectAmount));
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
    }
    // collect mapped selector
    const [amountToMapping, mappingOpenNode, mapArrowInspectAmount] = findFatArrow(params, index, {
        stopOnFail: false,
    });
    if (mappingOpenNode) {
        result.ranges.mapArrow.push(...params.slice(index, index + mapArrowInspectAmount));
        index += amountToMapping;
        // selector
        result.ranges.mapTo.push(...params.slice(index));
        index = params.length;
        const selectorStr = atRuleFullParams(atRule).slice(mappingOpenNode.end);
        const mappedSelectors = parseSelectorWithCache(selectorStr);
        const filteredSelector =
            mappedSelectors.length === 1 && filterCommentsAndSpaces(mappedSelectors[0]);
        if (filteredSelector && filteredSelector.nodes.length) {
            result.mappedSelector = filteredSelector;
        }
    }
    // unexpected extra value
    result.ranges.leftoverValue.push(...params.slice(index));

    return result;
}

function validateNestingInMapping(
    selector: ImmutableSelector,
    context: FeatureContext,
    atRule: postcss.AtRule
) {
    // check for unsupported & anywhere except first
    let invalid = false;
    let passedActualSelector = false;
    walkSelector(selector, (node) => {
        if (passedActualSelector && node.type === 'nesting') {
            context.diagnostics.report(diagnostics.MAPPING_UNSUPPORTED_NESTING(), {
                node: atRule,
            });
            invalid = true;
            return walkSelector.stopAll;
        } else if (node.type !== 'comment' && node.type !== 'selector') {
            passedActualSelector = true;
        }
        return;
    });
    return invalid;
}

function atRuleFullParams(atRule: postcss.AtRule) {
    const afterName = atRule.raws.afterName || '';
    const between = atRule.raws.between || '';
    return afterName + atRule.params + between;
}

function filterCommentsAndSpaces(selector: ImmutableSelector) {
    const filteredSelector: ImmutableSelector = {
        ...selector,
        after: '',
        before: '',
        nodes: selector.nodes.filter((node) => node.type !== 'comment'),
    };
    return filteredSelector;
}
