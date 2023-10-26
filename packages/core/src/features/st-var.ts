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
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { processDeclarationFunctions } from '../process-declaration-functions';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import type { ParsedValue } from '../types';
import type { Stylable } from '../stylable';
import type { RuntimeStVar } from '../stylable-transformer';
import postcssValueParser from 'postcss-value-parser';

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
    NO_VARS_DEF_IN_ST_SCOPE: createDiagnosticReporter(
        '07002',
        'error',
        () => `cannot define ":vars" inside of "@st-scope"`
    ),
    DEPRECATED_ST_FUNCTION_NAME: createDiagnosticReporter(
        '07003',
        'info',
        (name: string, alternativeName: string) =>
            `"${name}" is deprecated, use "${alternativeName}"`
    ),
    CYCLIC_VALUE: createDiagnosticReporter(
        '07004',
        'error',
        (cyclicChain: string[]) =>
            `Cyclic value definition detected: "${cyclicChain
                .map((s, i) => (i === cyclicChain.length - 1 ? '↻ ' : i === 0 ? '→ ' : '↪ ') + s)
                .join('\n')}"`
    ),
    MISSING_VAR_IN_VALUE: createDiagnosticReporter(
        '07005',
        'error',
        () => `invalid value() with no var identifier`
    ),
    COULD_NOT_RESOLVE_VALUE: createDiagnosticReporter(
        '07006',
        'error',
        (args?: string) =>
            `cannot resolve value function${args ? ` using the arguments provided: "${args}"` : ''}`
    ),
    MULTI_ARGS_IN_VALUE: createDiagnosticReporter(
        '07007',
        'error',
        (args: string) => `value function accepts only a single argument: "value(${args})"`
    ),
    CANNOT_USE_AS_VALUE: createDiagnosticReporter(
        '07008',
        'error',
        (type: string, varName: string) => `${type} "${varName}" cannot be used as a variable`
    ),
    CANNOT_USE_JS_AS_VALUE: createDiagnosticReporter(
        '07009',
        'error',
        (type: string, varName: string) =>
            `JavaScript ${type} import "${varName}" cannot be used as a variable`
    ),
    UNKNOWN_VAR: createDiagnosticReporter(
        '07010',
        'error',
        (name: string) => `unknown var "${name}"`
    ),
    UNKNOWN_CUSTOM_PROP: createDiagnosticReporter('07011', 'info', (names: string[]) => {
        const msgStart =
            names.length > 1
                ? `Unknown custom-properties "${names.join(', ')}" are`
                : `Unknown custom-property "${names[0]}" is`;
        return `${msgStart} currently not namespaced. However, in Stylable 6, it will be namespaced to the stylesheet. To maintain the current behavior, either wrap the value in quotes or establish a global custom property. If you intend for the custom property to be namespaced based on a different stylesheet context where the variable may be utilized, please reconsider your approach, as this will not be supported in future versions.`;
    }),
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
                context.diagnostics.report(diagnostics.NO_VARS_DEF_IN_ST_SCOPE(), { node: rule });
            } else {
                collectVarSymbols(context, rule);
            }
            // stop further walk into `:vars {}`
            return walkSelector.stopAll;
        } else {
            context.diagnostics.report(diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(`:vars`), {
                node: rule,
            });
        }
        return;
    },
    transformInit({ context }) {
        const { cssVar } = context.getResolvedSymbols(context.meta);
        for (const [_localName, localSymbol] of Object.entries(
            STSymbol.getAllByType(context.meta, 'var')
        )) {
            const value = postcssValueParser(stripQuotation(localSymbol.text));
            const unknownUsedProps: string[] = [];
            value.walk((node) => {
                if (node.type === 'function' && node.value.toLowerCase() === 'var') {
                    for (const argNode of node.nodes) {
                        if (
                            argNode.type === 'word' &&
                            argNode.value.startsWith('--') &&
                            !cssVar[argNode.value]
                        ) {
                            unknownUsedProps.push(argNode.value);
                        }
                    }
                }
            });
            if (unknownUsedProps.length) {
                context.diagnostics.report(diagnostics.UNKNOWN_CUSTOM_PROP(unknownUsedProps), {
                    node: localSymbol.node,
                });
            }
        }
    },
    prepareAST({ node, toRemove }) {
        if (node.type === 'rule' && node.selector === ':vars') {
            toRemove.push(node);
        }
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
                // ToDo: change to `value(${name})` in order to fix overrides in exports
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
        const getResolvedSymbols = createSymbolResolverWithCache(
            this.stylable.resolver,
            topLevelDiagnostics
        );
        const evaluator = new StylableEvaluator({ getResolvedSymbols });

        const { var: stVars } = getResolvedSymbols(meta);

        const computed: Record<string, ComputedStVar> = {};

        for (const [localName, resolvedVar] of Object.entries(stVars)) {
            const diagnostics = new Diagnostics();
            const { outputValue, topLevelType, runtimeValue } = evaluator.evaluateValue(
                {
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

export function parseVarsFromExpr(expr: string) {
    const nameSet = new Set<string>();
    postcssValueParser(expr).walk((node) => {
        if (node.type === 'function' && node.value === 'value') {
            for (const argNode of node.nodes) {
                switch (argNode.type) {
                    case 'word':
                        nameSet.add(argNode.value);
                        return;
                    case 'div':
                        if (argNode.value === ',') {
                            return;
                        }
                }
            }
        }
    });
    return nameSet;
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
    });
}

function warnOnDeprecatedCustomValues(context: FeatureContext, decl: postcss.Declaration) {
    processDeclarationFunctions(
        decl,
        (node) => {
            if (node.type === 'nested-item' && deprecatedStFunctions[node.name]) {
                const { alternativeName } = deprecatedStFunctions[node.name];
                context.diagnostics.report(
                    diagnostics.DEPRECATED_ST_FUNCTION_NAME(node.name, alternativeName),
                    {
                        node: decl,
                        word: node.name,
                    }
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
    const { stVarOverride, value, node } = data;
    const passedThrough = context.passedThrough || [];
    const parsedArgs = strategies.args(parsedNode).map((x) => x.value);
    const varName = parsedArgs[0];
    const restArgs = parsedArgs.slice(1);

    // check var not empty
    if (!varName) {
        if (node) {
            context.diagnostics.report(diagnostics.MISSING_VAR_IN_VALUE(), {
                node,
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
                { ...context, passedThrough: passedThrough.concat(refUniqID) },
                {
                    ...data,
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
                    context.diagnostics.report(diagnostics.MULTI_ARGS_IN_VALUE(argsAsString), {
                        node,
                    });
                }
            }

            parsedNode.resolvedValue = context.evaluator.valueHook
                ? context.evaluator.valueHook(outputValue, varName, true, passedThrough)
                : outputValue;
        } else if (possibleNonSTVarSymbol) {
            const type = resolvedSymbols.mainNamespace[varName];
            if (type === `js`) {
                const deepResolve = resolvedSymbols.js[varName];
                const importedType = typeof deepResolve.symbol;
                if (importedType === 'string') {
                    parsedNode.resolvedValue = context.evaluator.valueHook
                        ? context.evaluator.valueHook(
                              deepResolve.symbol,
                              varName,
                              false,
                              passedThrough
                          )
                        : deepResolve.symbol;
                } else if (node) {
                    // unsupported Javascript value
                    // ToDo: provide actual exported id (default/named as x)
                    context.diagnostics.report(
                        diagnostics.CANNOT_USE_JS_AS_VALUE(importedType, varName),
                        {
                            node,
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
                context.diagnostics.report(diagnostics.UNKNOWN_VAR(varName), {
                    node,
                    word: varName,
                });
            }
        } else if (node) {
            context.diagnostics.report(diagnostics.UNKNOWN_VAR(varName), {
                node,
                word: varName,
            });
        }
    }
}

export function resolveReferencedVarNames(
    context: Pick<FeatureTransformContext, 'meta' | 'resolver'>,
    initialName: string
) {
    const refNames = new Set<string>();
    const varsToCheck: { meta: StylableMeta; name: string }[] = [
        { meta: context.meta, name: initialName },
    ];
    const checked = new Set<string>();
    while (varsToCheck.length) {
        const { meta, name } = varsToCheck.shift()!;
        const contextualId = meta.source + '/' + name;
        if (!checked.has(contextualId)) {
            checked.add(contextualId);
            refNames.add(name);
            const symbol = STSymbol.get(meta, name);
            switch (symbol?._kind) {
                case 'var':
                    parseVarsFromExpr(symbol.text).forEach((refName) =>
                        varsToCheck.push({
                            meta,
                            name: refName,
                        })
                    );
                    break;
                case 'import': {
                    const resolved = context.resolver.deepResolve(symbol);
                    if (resolved?._kind === 'css' && resolved.symbol._kind === 'var') {
                        varsToCheck.push({ meta: resolved.meta, name: resolved.symbol.name });
                    }
                    break;
                }
            }
        }
    }
    return refNames;
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
        context.diagnostics.report(diagnostics.CANNOT_USE_AS_VALUE(errorKind, name), {
            node,
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
        context.diagnostics.report(diagnostics.CYCLIC_VALUE(cyclicChain), {
            node,
            word: refUniqID, // ToDo: check word is path+var and not var name
        });
    }
    return stringifyFunction(value, parsedNode);
}

function createUniqID(source: string, varName: string) {
    return `${source}: ${varName}`;
}
