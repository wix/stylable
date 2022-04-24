import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { unbox, Box, deprecatedStFunctions, boxString } from '../custom-values';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableMeta } from '../stylable-meta';
import { createSymbolResolverWithCache, CSSResolve } from '../stylable-resolver';
import { EvalValueData, EvalValueResult, StylableEvaluator } from '../functions';
import { isChildOfAtRule } from '../helpers/rule';
import { walkSelector } from '../helpers/selector';
import { stringifyFunction, getStringValue, strategies } from '../helpers/value';
import { stripQuotation } from '../helpers/string';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { processDeclarationFunctions } from '../process-declaration-functions';
import { Diagnostics } from '../diagnostics';
import type { ParsedValue } from '../types';
import type { Stylable } from '../stylable';
import type { RuntimeStVar } from '../stylable-transformer';

export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    text: string;
    valueType: string | null;
    node: postcss.Node;
}

export type CustomValueInput = Box<
    string,
    CustomValueInput | Record<string, CustomValueInput | string> | Array<CustomValueInput | string>
>;

export interface ComputedStVar {
    value: RuntimeStVar;
    diagnostics: Diagnostics;
    input: CustomValueInput;
}

export interface FlatComputedStVar {
    value: string;
    path: string[];
}

export const diagnostics = {
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR,
    NO_VARS_DEF_IN_ST_SCOPE() {
        return `cannot define ":vars" inside of "@st-scope"`;
    },
    DEPRECATED_ST_FUNCTION_NAME: (name: string, alternativeName: string) => {
        return `"${name}" is deprecated, use "${alternativeName}"`;
    },
    CYCLIC_VALUE: (cyclicChain: string[]) =>
        `Cyclic value definition detected: "${cyclicChain
            .map((s, i) => (i === cyclicChain.length - 1 ? '↻ ' : i === 0 ? '→ ' : '↪ ') + s)
            .join('\n')}"`,
    MISSING_VAR_IN_VALUE: () => `invalid value() with no var identifier`,
    COULD_NOT_RESOLVE_VALUE: (args?: string) =>
        `cannot resolve value function${args ? ` using the arguments provided: "${args}"` : ''}`,
    MULTI_ARGS_IN_VALUE: (args: string) =>
        `value function accepts only a single argument: "value(${args})"`,
    CANNOT_USE_AS_VALUE: (type: string, varName: string) =>
        `${type} "${varName}" cannot be used as a variable`,
    CANNOT_USE_JS_AS_VALUE: (type: string, varName: string) =>
        `JavaScript ${type} import "${varName}" cannot be used as a variable`,
    UNKNOWN_VAR: (name: string) => `unknown var "${name}"`,
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: PseudoClass;
    IMMUTABLE_SELECTOR: ImmutablePseudoClass;
    RESOLVED: Record<string, EvalValueResult>;
}>({
    analyzeSelectorNode({ context, node, rule }) {
        if (node.type !== `pseudo_class` || node.value !== `vars`) {
            return;
        }
        // make sure `:vars` is the only selector
        if (rule.selector === `:vars`) {
            if (isChildOfAtRule(rule, `st-scope`)) {
                context.diagnostics.warn(rule, diagnostics.NO_VARS_DEF_IN_ST_SCOPE());
            } else {
                collectVarSymbols(context, rule);
            }
            rule.remove();
            // stop further walk into `:vars {}`
            return walkSelector.stopAll;
        } else {
            context.diagnostics.warn(rule, diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(`:vars`));
        }
        return;
    },
    transformResolve({ context }) {
        // Resolve local vars
        const resolved: Record<string, any> = {};
        const symbols = STSymbol.getAllByType(context.meta, `var`);
        // Temporarily don't report issues here // ToDo: move reporting here (from value() transformation)
        const noDaigContext = {
            ...context,
            diagnostics: new Diagnostics(),
        };
        for (const name of Object.keys(symbols)) {
            const symbol = symbols[name];
            const evaluated = context.evaluator.evaluateValue(noDaigContext, {
                value: stripQuotation(symbol.text),
                meta: context.meta,
                node: symbol.node,
            });
            resolved[name] = evaluated;
        }
        return resolved;
    },
    transformValue({ context, node, data }) {
        evaluateValueCall(context, node, data);
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, { topLevelType, outputValue }] of Object.entries(resolved)) {
            exports.stVars[name] = topLevelType ? unbox(topLevelType) : outputValue;
        }
    },
});

// API

export function get(meta: StylableMeta, name: string): VarSymbol | undefined {
    return STSymbol.get(meta, name, `var`);
}

// Stylable StVar Public APIs

export class StylablePublicApi {
    constructor(private stylable: Stylable) {}

    public getComputed(meta: StylableMeta) {
        const topLevelDiagnostics = new Diagnostics();
        const evaluator = new StylableEvaluator();
        const getResolvedSymbols = createSymbolResolverWithCache(
            this.stylable.resolver,
            topLevelDiagnostics
        );

        const { var: stVars } = getResolvedSymbols(meta);

        const computed: Record<string, ComputedStVar> = {};

        for (const [localName, resolvedVar] of Object.entries(stVars)) {
            const diagnostics = new Diagnostics();
            const { outputValue, topLevelType, runtimeValue } = evaluator.evaluateValue(
                {
                    getResolvedSymbols,
                    resolver: this.stylable.resolver,
                    evaluator,
                    meta,
                    diagnostics,
                },
                {
                    meta: resolvedVar.meta,
                    value: stripQuotation(resolvedVar.symbol.text),
                    node: resolvedVar.symbol.node,
                }
            );

            const computedStVar: ComputedStVar = {
                value: runtimeValue ?? outputValue,
                input: topLevelType ?? unbox(outputValue, false),
                diagnostics,
            };

            computed[localName] = computedStVar;
        }

        return computed;
    }

    public flatten(meta: StylableMeta) {
        const computed = this.getComputed(meta);

        const flatStVars: FlatComputedStVar[] = [];

        for (const [symbol, stVar] of Object.entries(computed)) {
            flatStVars.push(...this.flatSingle(stVar.input, [symbol]));
        }

        return flatStVars;
    }

    private flatSingle(input: CustomValueInput, path: string[]) {
        const currentVars: FlatComputedStVar[] = [];

        if (input.flatValue) {
            currentVars.push({
                value: input.flatValue,
                path,
            });
        }

        if (typeof input.value === `object` && input.value !== null) {
            for (const [key, innerInput] of Object.entries(input.value)) {
                currentVars.push(
                    ...this.flatSingle(
                        typeof innerInput === 'string' ? boxString(innerInput) : innerInput,
                        [...path, key]
                    )
                );
            }
        }

        return currentVars;
    }
}

function collectVarSymbols(context: FeatureContext, rule: postcss.Rule) {
    rule.walkDecls((decl) => {
        collectUrls(context.meta, decl); // ToDo: remove
        warnOnDeprecatedCustomValues(context, decl);

        // check type annotation
        let type = null;
        const prev = decl.prev() as postcss.Comment;
        if (prev && prev.type === 'comment') {
            const typeMatch = prev.text.match(/^@type (.+)$/);
            if (typeMatch) {
                type = typeMatch[1];
            }
        }
        // add symbol
        const name = decl.prop;
        STSymbol.addSymbol({
            context,
            symbol: {
                _kind: 'var',
                name,
                value: '',
                text: decl.value,
                node: decl,
                valueType: type,
            },
            node: decl,
        });
        // deprecated
        ignoreDeprecationWarn(() => {
            context.meta.vars.push(STSymbol.get(context.meta, name, `var`)!);
        });
    });
}

function warnOnDeprecatedCustomValues(context: FeatureContext, decl: postcss.Declaration) {
    processDeclarationFunctions(
        decl,
        (node) => {
            if (node.type === 'nested-item' && deprecatedStFunctions[node.name]) {
                const { alternativeName } = deprecatedStFunctions[node.name];
                context.diagnostics.info(
                    decl,
                    diagnostics.DEPRECATED_ST_FUNCTION_NAME(node.name, alternativeName),
                    { word: node.name }
                );
            }
        },
        false
    );
}

// ToDo: remove after moving :vars removal to end of analyze.
// url collection should pickup vars value during general decls walk
function collectUrls(meta: StylableMeta, decl: postcss.Declaration) {
    processDeclarationFunctions(
        decl,
        (node) => {
            if (node.type === 'url') {
                meta.urls.push(node.url);
            }
        },
        false
    );
}

function evaluateValueCall(
    context: FeatureTransformContext,
    parsedNode: ParsedValue,
    data: EvalValueData
): void {
    const { stVarOverride, passedThrough, value, node } = data;
    const parsedArgs = strategies.args(parsedNode).map((x) => x.value);
    const varName = parsedArgs[0];
    const restArgs = parsedArgs.slice(1);

    // check var not empty
    if (!varName) {
        if (node) {
            context.diagnostics.warn(node, diagnostics.MISSING_VAR_IN_VALUE(), {
                word: getStringValue(parsedNode),
            });
        }
    } else if (parsedArgs.length >= 1) {
        // override with value
        if (stVarOverride?.[varName]) {
            parsedNode.resolvedValue = stVarOverride?.[varName];
            return;
        }
        // check cyclic
        const refUniqID = createUniqID(data.meta.source, varName);
        if (passedThrough.includes(refUniqID)) {
            // TODO: move diagnostic to original value usage instead of the end of the cyclic chain
            handleCyclicValues(context, passedThrough, refUniqID, data.node, value, parsedNode);
            return;
        }
        // resolve
        const resolvedSymbols = context.getResolvedSymbols(data.meta);
        const resolvedVar = resolvedSymbols.var[varName];
        const resolvedVarSymbol = resolvedVar?.symbol;
        const possibleNonSTVarSymbol = STSymbol.get(context.meta, varName);
        if (resolvedVarSymbol) {
            const { outputValue, topLevelType, typeError } = context.evaluator.evaluateValue(
                context,
                {
                    ...data,
                    passedThrough: passedThrough.concat(refUniqID),
                    value: stripQuotation(resolvedVarSymbol.text),
                    args: restArgs,
                    node: resolvedVarSymbol.node,
                    meta: resolvedVar.meta,
                    rootArgument: varName,
                    initialNode: node,
                }
            );
            // report errors
            if (node) {
                const argsAsString = parsedArgs.join(', ');
                if (!typeError && !topLevelType && parsedArgs.length > 1) {
                    context.diagnostics.warn(node, diagnostics.MULTI_ARGS_IN_VALUE(argsAsString));
                }
            }

            parsedNode.resolvedValue = data.valueHook
                ? data.valueHook(outputValue, varName, true, passedThrough)
                : outputValue;
        } else if (possibleNonSTVarSymbol) {
            const type = resolvedSymbols.mainNamespace[varName];
            if (type === `js`) {
                const deepResolve = resolvedSymbols.js[varName];
                const importedType = typeof deepResolve.symbol;
                if (importedType === 'string') {
                    parsedNode.resolvedValue = data.valueHook
                        ? data.valueHook(deepResolve.symbol, varName, false, passedThrough)
                        : deepResolve.symbol;
                } else if (node) {
                    // unsupported Javascript value
                    // ToDo: provide actual exported id (default/named as x)
                    context.diagnostics.warn(
                        node,
                        diagnostics.CANNOT_USE_JS_AS_VALUE(importedType, varName),
                        {
                            word: varName,
                        }
                    );
                }
            } else if (type) {
                // report mismatch type
                const deepResolve = resolvedSymbols[type][varName];
                let finalResolve: CSSResolve = {
                    _kind: `css`,
                    meta: data.meta,
                    symbol: possibleNonSTVarSymbol,
                };
                if (deepResolve instanceof Array) {
                    // take the deep resolved in order to
                    // print the actual mismatched type
                    finalResolve = deepResolve[deepResolve.length - 1];
                } else if (deepResolve._kind === `css`) {
                    finalResolve = deepResolve;
                }
                reportUnsupportedSymbolInValue(context, varName, finalResolve, node);
            } else if (node) {
                // report unknown var
                context.diagnostics.error(node, diagnostics.UNKNOWN_VAR(varName), {
                    word: varName,
                });
            }
        } else if (node) {
            context.diagnostics.warn(node, diagnostics.UNKNOWN_VAR(varName), {
                word: varName,
            });
        }
    }
}

function reportUnsupportedSymbolInValue(
    context: FeatureTransformContext,
    name: string,
    resolve: CSSResolve,
    node: postcss.Node | undefined
) {
    const symbol = resolve.symbol;
    const errorKind = symbol._kind === 'class' && symbol[`-st-root`] ? 'stylesheet' : symbol._kind;
    if (node) {
        context.diagnostics.warn(node, diagnostics.CANNOT_USE_AS_VALUE(errorKind, name), {
            word: name,
        });
    }
}

function handleCyclicValues(
    context: FeatureTransformContext,
    passedThrough: string[],
    refUniqID: string,
    node: postcss.Node | undefined,
    value: string,
    parsedNode: ParsedValue
) {
    if (node) {
        const cyclicChain = passedThrough.map((variable) => variable || '');
        cyclicChain.push(refUniqID);
        context.diagnostics.warn(node, diagnostics.CYCLIC_VALUE(cyclicChain), {
            word: refUniqID, // ToDo: check word is path+var and not var name
        });
    }
    return stringifyFunction(value, parsedNode);
}

function createUniqID(source: string, varName: string) {
    return `${source}: ${varName}`;
}
