import type * as postcss from 'postcss';
import postcssValueParser, { FunctionNode, WordNode } from 'postcss-value-parser';
import type { Diagnostics } from './diagnostics';
import { processPseudoStates } from './pseudo-states';
import { parseSelectorWithCache } from './helpers/selector';
import { getNamedArgs, strategies } from './helpers/value';
import type { StateParsedValue } from './types';

export const valueParserWarnings = {
    VALUE_CANNOT_BE_STRING() {
        return 'value can not be a string (remove quotes?)';
    },
};

export interface MappedStates {
    [s: string]: StateParsedValue | string | null;
}

// TODO: remove
export interface TypedClass {
    '-st-root'?: boolean;
    '-st-states'?: string[] | MappedStates;
    '-st-extends'?: string;
}

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl?: postcss.Declaration;
}

export interface ArgValue {
    type: string;
    value: string;
}
export interface ExtendsValue {
    symbolName: string;
    args: ArgValue[][] | null;
}

export type ReportWarning = (message: string, options?: { word: string }) => void;

export const rootValueMapping = {
    vars: ':vars' as const,
    import: ':import' as const,
    stScope: 'st-scope' as const,
    namespace: 'namespace' as const,
};

export const valueMapping = {
    from: '-st-from' as const,
    named: '-st-named' as const,
    default: '-st-default' as const,
    root: '-st-root' as const,
    states: '-st-states' as const,
    extends: '-st-extends' as const,
    mixin: '-st-mixin' as const,
    partialMixin: '-st-partial-mixin' as const,
    global: '-st-global' as const,
};

export const mixinDeclRegExp = new RegExp(`(${valueMapping.mixin})|(${valueMapping.partialMixin})`);

export type stKeys = keyof typeof valueMapping;

export const stValues: string[] = Object.keys(valueMapping).map(
    (key) => valueMapping[key as stKeys]
);

export const animationPropRegExp = /animation$|animation-name$/;

export const stValuesMap: Record<string, boolean> = Object.keys(valueMapping).reduce((acc, key) => {
    acc[valueMapping[key as stKeys]] = true;
    return acc;
}, {} as Record<string, boolean>);

export const STYLABLE_VALUE_MATCHER = /^-st-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    '-st-root'(value: string) {
        return value === 'false' ? false : true;
    },
    '-st-global'(decl: postcss.Declaration, _diagnostics: Diagnostics) {
        // Experimental
        const selector = parseSelectorWithCache(
            decl.value.replace(/^['"]/, '').replace(/['"]$/, ''),
            { clone: true }
        );
        // ToDo: handle or warn on multiple selectors
        return selector[0].nodes;
    },
    '-st-states'(value: string, decl: postcss.Declaration, diagnostics: Diagnostics) {
        if (!value) {
            return {};
        }

        return processPseudoStates(value, decl, diagnostics);
    },
    '-st-extends'(value: string) {
        const ast = postcssValueParser(value);
        const types: ExtendsValue[] = [];

        ast.walk((node) => {
            if (node.type === 'function') {
                const args = getNamedArgs(node);

                types.push({
                    symbolName: node.value,
                    args,
                });

                return false;
            } else if (node.type === 'word') {
                types.push({
                    symbolName: node.value,
                    args: null,
                });
            }
            return undefined;
        }, false);

        return {
            ast,
            types,
        };
    },
    '-st-mixin'(
        mixinNode: postcss.Declaration,
        strategy: (type: string) => 'named' | 'args',
        diagnostics?: Diagnostics,
        emitStrategyDiagnostics = true
    ) {
        const ast = postcssValueParser(mixinNode.value);
        const mixins: Array<MixinValue> = [];

        function reportWarning(message: string, options?: { word: string }) {
            if (emitStrategyDiagnostics) {
                diagnostics?.warn(mixinNode, message, options);
            }
        }

        ast.nodes.forEach((node) => {
            if (node.type === 'function') {
                mixins.push({
                    type: node.value,
                    options: strategies[strategy(node.value)](node, reportWarning),
                    valueNode: node,
                    originDecl: mixinNode,
                });
            } else if (node.type === 'word') {
                mixins.push({
                    type: node.value,
                    options: strategy(node.value) === 'named' ? {} : [],
                    valueNode: node,
                    originDecl: mixinNode,
                });
            } else if (node.type === 'string') {
                diagnostics?.error(mixinNode, valueParserWarnings.VALUE_CANNOT_BE_STRING(), {
                    word: mixinNode.value,
                });
            }
        });

        return mixins;
    },
    '-st-partial-mixin'(
        mixinNode: postcss.Declaration,
        strategy: (type: string) => 'named' | 'args',
        diagnostics?: Diagnostics
    ) {
        return SBTypesParsers['-st-mixin'](mixinNode, strategy, diagnostics).map((mixin) => {
            mixin.partial = true;
            return mixin;
        });
    },
};
