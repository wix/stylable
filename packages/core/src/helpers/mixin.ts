import { createDiagnosticReporter, DiagnosticBase, Diagnostics } from '../diagnostics';
import { strategies, valueDiagnostics } from './value';
import type { MixinValue } from '../features';
import type * as postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';

export const mixinHelperDiagnostics = {
    INVALID_NAMED_PARAMS: valueDiagnostics.INVALID_NAMED_PARAMS,
    VALUE_CANNOT_BE_STRING: createDiagnosticReporter(
        '10008',
        'error',
        () => 'value can not be a string (remove quotes?)'
    ),
};

export function parseStMixin(
    mixinNode: postcss.Declaration,
    strategy: (type: string) => 'named' | 'args',
    diagnostics?: Diagnostics,
    emitStrategyDiagnostics = true
) {
    const ast = postcssValueParser(mixinNode.value);
    const mixins: Array<MixinValue> = [];

    function reportWarning(diagnostic: DiagnosticBase, options?: { word: string }) {
        if (emitStrategyDiagnostics) {
            diagnostics?.report(diagnostic, { ...options, node: mixinNode });
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
            diagnostics?.report(mixinHelperDiagnostics.VALUE_CANNOT_BE_STRING(), {
                node: mixinNode,
                word: mixinNode.value,
            });
        }
    });

    return mixins;
}
export function parseStPartialMixin(
    mixinNode: postcss.Declaration,
    strategy: (type: string) => 'named' | 'args',
    report?: Diagnostics,
    emitStrategyDiagnostics?: boolean
) {
    return parseStMixin(mixinNode, strategy, report, emitStrategyDiagnostics).map((mixin) => {
        mixin.partial = true;
        return mixin;
    });
}
