import { createFeature, FeatureContext, FeatureTransformContext } from './feature';
import { deprecatedStFunctions } from '../custom-values';
import { generalDiagnostics } from './diagnostics';
import * as STSymbol from './st-symbol';
import type { StylableMeta } from '../stylable-meta';
import type { EvalValueData, EvalValueResult } from '../functions';
import { isChildOfAtRule } from '../helpers/rule';
import { walkSelector } from '../helpers/selector';
import { stringifyFunction } from '../helpers/value';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';
import { processDeclarationFunctions } from '../process-declaration-functions';
import { Diagnostics } from '../diagnostics';
import { unbox } from '../custom-values';
// ToDo: move
import { strategies, valueMapping } from '../stylable-value-parsers';
import { stripQuotation } from '../utils';
import type { ParsedValue } from '../types';

export interface VarSymbol {
    _kind: 'var';
    name: string;
    value: string;
    text: string;
    valueType: string | null;
    node: postcss.Node;
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
    COULD_NOT_RESOLVE_VALUE: (args: string) =>
        `cannot resolve value function using the arguments provided: "${args}"`,
    MULTI_ARGS_IN_VALUE: (args: string) =>
        `value function accepts only a single argument: "value(${args})"`,
    CANNOT_USE_AS_VALUE: (type: string, varName: string) =>
        `${type} "${varName}" cannot be used as a variable`,
    CANNOT_USE_JS_AS_VALUE: (varName: string) =>
        `JavaScript import "${varName}" cannot be used as a variable`,
    CANNOT_FIND_IMPORTED_VAR: (varName: string) => `cannot use unknown imported "${varName}"`,
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
                value: symbol.text,
                meta: context.meta,
                node: symbol.node,
            });
            resolved[name] = evaluated;
        }
        return resolved;
    },
    transformDeclarationValue({ context, node, data }) {
        evaluateValueCall(context, node, data);
    },
    transformJSExports({ exports, resolved }) {
        for (const [name, { topLevelType, outputValue }] of Object.entries(resolved)) {
            exports.stVars[name] = topLevelType ? unbox(topLevelType) : outputValue;
        }
    },
});

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
        context.meta.vars.push(STSymbol.get(context.meta, name, `var`)!);
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
    const { tsVarOverride, passedThrough, value, node } = data;
    const parsedArgs = strategies.args(parsedNode).map((x) => x.value);
    if (parsedArgs.length >= 1) {
        const varName = parsedArgs[0];
        const restArgs = parsedArgs.slice(1);

        // override with value
        if (tsVarOverride?.[varName]) {
            parsedNode.resolvedValue = tsVarOverride?.[varName];
            return;
        }
        // check cyclic
        const refUniqID = createUniqID(context.meta.source, varName);
        if (passedThrough.includes(refUniqID)) {
            // TODO: move diagnostic to original value usage instead of the end of the cyclic chain
            handleCyclicValues(context, passedThrough, refUniqID, data.node, value, parsedNode);
            return;
        }
        // resolve
        const varSymbol = STSymbol.get(context.meta, varName);
        if (varSymbol && varSymbol._kind === 'var') {
            // evaluate local var
            const { outputValue, topLevelType, typeError } = context.evaluator.evaluateValue(
                context,
                {
                    ...data,
                    passedThrough: passedThrough.concat(createUniqID(context.meta.source, varName)),
                    value: stripQuotation(varSymbol.text),
                    args: restArgs,
                    node: varSymbol.node,
                }
            );
            // report errors
            if (node) {
                const argsAsString = parsedArgs.join(', ');
                if (typeError) {
                    context.diagnostics.warn(
                        node,
                        diagnostics.COULD_NOT_RESOLVE_VALUE(argsAsString)
                    );
                } else if (!topLevelType && parsedArgs.length > 1) {
                    context.diagnostics.warn(node, diagnostics.MULTI_ARGS_IN_VALUE(argsAsString));
                }
            }

            parsedNode.resolvedValue = data.valueHook
                ? data.valueHook(outputValue, varName, true, passedThrough)
                : outputValue;
        } else if (varSymbol && varSymbol._kind === 'import') {
            // evaluate imported var
            const resolvedVar = context.resolver.deepResolve(varSymbol);
            if (resolvedVar && resolvedVar.symbol) {
                const resolvedVarSymbol = resolvedVar.symbol;
                if (resolvedVar._kind === 'css') {
                    if (resolvedVarSymbol._kind === 'var') {
                        // var from stylesheet
                        const { outputValue } = context.evaluator.evaluateValue(context, {
                            ...data,
                            passedThrough: passedThrough.concat(
                                createUniqID(context.meta.source, varName)
                            ),
                            value: stripQuotation(resolvedVarSymbol.text),
                            meta: resolvedVar.meta,
                            node: resolvedVarSymbol.node,
                            args: restArgs,
                        });
                        parsedNode.resolvedValue = data.valueHook
                            ? data.valueHook(outputValue, varName, false, passedThrough)
                            : outputValue;
                    } else {
                        // report error
                        const errorKind =
                            resolvedVarSymbol._kind === 'class' &&
                            resolvedVarSymbol[valueMapping.root]
                                ? 'stylesheet'
                                : resolvedVarSymbol._kind;
                        if (node) {
                            context.diagnostics.warn(
                                node,
                                diagnostics.CANNOT_USE_AS_VALUE(errorKind, varName),
                                { word: varName }
                            );
                        }
                    }
                } else if (resolvedVar._kind === 'js' && typeof resolvedVar.symbol === 'string') {
                    // value from Javascript
                    parsedNode.resolvedValue = data.valueHook
                        ? data.valueHook(resolvedVar.symbol, varName, false, passedThrough)
                        : resolvedVar.symbol;
                } else if (resolvedVar._kind === 'js' && node) {
                    // unsupported Javascript value
                    // ToDo: provide actual exported id (default/named as x)
                    context.diagnostics.warn(node, diagnostics.CANNOT_USE_JS_AS_VALUE(varName), {
                        word: varName,
                    });
                }
            } else {
                // missing imported var
                const namedDecl = varSymbol.import.rule.nodes.find((node) => {
                    return node.type === 'decl' && node.prop === valueMapping.named;
                });
                if (namedDecl && node) {
                    // ToDo: provide actual exported id (default/named as x)
                    context.diagnostics.error(node, diagnostics.CANNOT_FIND_IMPORTED_VAR(varName), {
                        word: varName,
                    });
                }
            }
        } else if (node) {
            context.diagnostics.warn(node, diagnostics.UNKNOWN_VAR(varName), {
                word: varName,
            });
        }
    } else {
        // TODO: warn
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
            word: refUniqID,
        });
    }
    return stringifyFunction(value, parsedNode);
}

function createUniqID(source: string, varName: string) {
    return `${source}: ${varName}`;
}
