import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { Diagnostics } from './diagnostics';
import { processPseudoStates } from './pseudo-states';
import { parseSelectorWithCache } from './helpers/selector';
import { parseStMixin, parseStPartialMixin } from './helpers/mixin';
import { getNamedArgs } from './helpers/value';
import type { StateParsedValue } from './types';
import type { SelectorNodes } from '@tokey/css-selector-parser';
import { CSSClass } from './features';

export interface MappedStates {
    [s: string]: StateParsedValue | string | null;
}

// TODO: remove
export interface TypedClass {
    '-st-root'?: boolean;
    '-st-states'?: string[] | MappedStates;
    '-st-extends'?: string;
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
    mixin: '-st-mixin' as const, // ToDo: change to STMixin.MixinType.ALL,
    partialMixin: '-st-partial-mixin' as const, // ToDo: change to STMixin.MixinType.PARTIAL,
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
    '-st-global'(decl: postcss.Declaration, diagnostics: Diagnostics): SelectorNodes | undefined {
        const selector = parseSelectorWithCache(
            decl.value.replace(/^['"]/, '').replace(/['"]$/, ''),
            { clone: true }
        );
        if (!selector[0]) {
            diagnostics.error(decl, CSSClass.diagnostics.EMPTY_ST_GLOBAL());
            return;
        } else if (selector.length > 1) {
            diagnostics.error(decl, CSSClass.diagnostics.UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL());
        }
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
    '-st-mixin': parseStMixin,
    '-st-partial-mixin': parseStPartialMixin,
};
