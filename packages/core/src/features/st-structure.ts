import { plugableRecord } from '../helpers/plugable-record';
import { FeatureContext, createFeature } from './feature';
import * as STSymbol from './st-symbol';
import * as STPart from './st-part';
import * as STCustomState from './st-custom-state';
import type { MappedStates } from './st-custom-state';
import * as CSSClass from './css-class';
import { warnOnce } from '../helpers/deprecation';
import type postcss from 'postcss';
import { parseCSSValue, stringifyCSSValue, BaseAstNode } from '@tokey/css-value-parser';
import { parseSelectorWithCache } from '../helpers/selector';
import { ImmutableSelectorList, stringifySelectorAst } from '@tokey/css-selector-parser';
import { createDiagnosticReporter } from '../diagnostics';
import { getAlias } from '../stylable-utils';
import {
    findAnything,
    findFatArrow,
    findNextClassNode,
    findNextPseudoClassNode,
} from '../helpers/css-value-seeker';

export const diagnostics = {
    GLOBAL_MAPPING_LIMITATION: createDiagnosticReporter(
        '21000',
        'error',
        () => `Currently class mapping is limited to single global selector: :global(<selector>)`
    ),
    INVALID_MAPPING: createDiagnosticReporter(
        '21001',
        'error',
        () =>
            'class mapping expects a single selector within a global pseudo-class `=> :global(<selector>)`'
    ),
    UNSUPPORTED_TOP_DEF: createDiagnosticReporter(
        '21002',
        'error',
        () => 'top level @st must start with a class'
    ),
    MISSING_EXTEND: createDiagnosticReporter(
        '21003',
        'error',
        () => `missing required class reference to extend a class (e.g. ":is(.class-name)"`
    ),
    OVERRIDE_IMPORTED_CLASS: createDiagnosticReporter(
        '21004',
        'error',
        () => `cannot override imported class definition`
    ),
    STATE_OUT_OF_CONTEXT: createDiagnosticReporter(
        '21005',
        'error',
        () => 'state definition must be directly nested in a `@st .class{}` definition'
    ),
    REDECLARE_STATE: createDiagnosticReporter(
        '21006',
        'error',
        (name: string) => `state "${name}" is already declared`
    ),
};
export const experimentalMsg = '[experimental feature] stylable structure (@st): API might change!';

const dataKey = plugableRecord.key<{
    analyzedDefs: WeakMap<postcss.AtRule, AnalyzedStDef>;
}>('st-structure');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, { analyzedDefs: new WeakMap() });
    },
    analyzeAtRule({ context, atRule }) {
        if (!isStAtRule(atRule)) {
            return;
        }

        warnOnce(experimentalMsg);
        STPart.disableAutoClassToPart(context.meta);

        const analyzed = analyzeStAtRule(atRule, context);
        if (!analyzed) {
            if (atRule.parent?.type === 'root') {
                context.diagnostics.report(diagnostics.UNSUPPORTED_TOP_DEF(), {
                    node: atRule,
                });
            } else {
                // ToDo: error on invalid nested definition
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
            if (analyzed.mappedSelectors) {
                const selectors = analyzed.mappedSelectors;
                const firstSelectorNodes = selectors[0]?.nodes;
                if (
                    selectors.length !== 1 ||
                    firstSelectorNodes.length === 0 ||
                    firstSelectorNodes.length > 1
                ) {
                    context.diagnostics.report(diagnostics.INVALID_MAPPING(), {
                        node: atRule,
                    });
                } else if (
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
                    CSSClass.extendTypedRule(
                        context,
                        atRule,
                        analyzed.name,
                        '-st-global',
                        firstSelectorNodes[0].nodes[0].nodes
                    );
                }
            }
        } else if (analyzed.type === 'state') {
            const classSymbol = CSSClass.get(context.meta, analyzed.class);
            if (!classSymbol) {
                // assuming analyzing @st definitions dfs - class must be defined
                return;
            }
            const mappedStates = (classSymbol['-st-states'] ||= {});
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
});

// API

function isStAtRule(node: postcss.AnyNode): node is postcss.AtRule {
    return node?.type === 'atrule' && node.name === 'st';
}
interface ParsedStClass {
    type: 'topLevelClass';
    name: string;
    extendedClass?: string;
    mappedSelectors?: ImmutableSelectorList;
}

interface ParsedStState {
    type: 'state';
    name: string;
    stateDef: MappedStates[string];
    class: string;
}

type AnalyzedStDef = undefined | ParsedStClass | ParsedStState;
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
    if (parentAnalyze?.type !== 'topLevelClass') {
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
        class: parentAnalyze.name,
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
    // collect mapped selectors
    const [amountToMapping, mappingOpenNode] = findFatArrow(params, index, {
        stopOnFail: false,
    });
    if (amountToMapping) {
        index = atRule.params.length;
        const mappedSelectors = parseSelectorWithCache(atRule.params.slice(mappingOpenNode!.end));
        if (mappedSelectors) {
            result.mappedSelectors = mappedSelectors;
        }
    }
    // check leftover nodes
    const [amountToUnexpectedNode] = findAnything(params, index);
    if (result.name && !amountToUnexpectedNode) {
        return result;
    }
    return;
}
