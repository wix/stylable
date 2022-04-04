import type { Diagnostics } from '../diagnostics';
import { strategies, valueDiagnostics } from './value';
import type { MixinValue } from '../features';
import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';

export const diagnostics = {
    INVALID_NAMED_PARAMS: valueDiagnostics.INVALID_NAMED_PARAMS,
    VALUE_CANNOT_BE_STRING() {
        return 'value can not be a string (remove quotes?)';
    },
};

export function parseStMixin(
    mixinNode: postcss.Declaration,
    strategy: (type: string) => 'named' | 'args',
    report?: Diagnostics,
    emitStrategyDiagnostics = true
) {
    const ast = postcssValueParser(mixinNode.value);
    const mixins: Array<MixinValue> = [];

    function reportWarning(message: string, options?: { word: string }) {
        if (emitStrategyDiagnostics) {
            report?.warn(mixinNode, message, options);
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
            report?.error(mixinNode, diagnostics.VALUE_CANNOT_BE_STRING(), {
                word: mixinNode.value,
            });
        }
    });

    return mixins;
}
export function parseStPartialMixin(
    mixinNode: postcss.Declaration,
    strategy: (type: string) => 'named' | 'args',
    report?: Diagnostics
) {
    return parseStMixin(mixinNode, strategy, report).map((mixin) => {
        mixin.partial = true;
        return mixin;
    });
}
