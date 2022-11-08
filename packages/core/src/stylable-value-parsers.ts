import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { Diagnostics } from './diagnostics';
import { parseSelectorWithCache } from './helpers/selector';
import { parseStMixin, parseStPartialMixin } from './helpers/mixin';
import { getNamedArgs } from './helpers/value';
import type { SelectorNodes } from '@tokey/css-selector-parser';
import { CSSClass } from './features';

export interface ArgValue {
    type: string;
    value: string;
}
export interface ExtendsValue {
    symbolName: string;
    args: ArgValue[][] | null;
}

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
            diagnostics.report(CSSClass.diagnostics.EMPTY_ST_GLOBAL(), {
                node: decl,
            });
            return;
        } else if (selector.length > 1) {
            diagnostics.report(CSSClass.diagnostics.UNSUPPORTED_MULTI_SELECTORS_ST_GLOBAL(), {
                node: decl,
            });
        }
        return selector[0].nodes;
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
