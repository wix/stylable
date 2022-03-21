import { createFeature } from './feature';
import * as STSymbol from './st-symbol';
import type { ImportSymbol } from './st-import';
import type { ClassSymbol } from './css-class';
import {
    diagnostics as MixinHelperDiagnostics,
    parseStMixin,
    parseStPartialMixin,
} from '../helpers/mixin';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type * as postcss from 'postcss';
import type { FunctionNode, WordNode } from 'postcss-value-parser';
// ToDo: deprecate - stop usage
import type { SRule } from '../deprecated/postcss-ast-extension';

export interface MixinValue {
    type: string;
    options: Array<{ value: string }> | Record<string, string>;
    partial?: boolean;
    valueNode?: FunctionNode | WordNode;
    originDecl?: postcss.Declaration;
}

export interface RefedMixin {
    mixin: MixinValue;
    ref: ImportSymbol | ClassSymbol;
}

export const MixinType = {
    ALL: `-st-mixin` as const,
    PARTIAL: `-st-partial-mixin` as const,
};

export const diagnostics = {
    VALUE_CANNOT_BE_STRING: MixinHelperDiagnostics.VALUE_CANNOT_BE_STRING,
    PARTIAL_MIXIN_MISSING_ARGUMENTS(type: string) {
        return `"${MixinType.PARTIAL}" can only be used with override arguments provided, missing overrides on "${type}"`;
    },
    UNKNOWN_MIXIN(name: string) {
        return `unknown mixin: "${name}"`;
    },
    OVERRIDE_MIXIN(mixinType: string) {
        return `override ${mixinType} on same rule`;
    },
};

// HOOKS

export const hooks = createFeature({
    analyzeDeclaration({ context, decl }) {
        const parser =
            decl.prop === MixinType.ALL
                ? parseStMixin
                : decl.prop === MixinType.PARTIAL
                ? parseStPartialMixin
                : null;
        if (!parser) {
            return;
        }
        const rule = decl.parent as SRule;
        const { meta } = context;
        const mixins: RefedMixin[] = [];
        /**
         * This functionality is broken we don't know what strategy to choose here.
         * Should be fixed when we refactor to the new flow
         */
        parser(
            decl,
            (type) => {
                const symbol = STSymbol.get(meta, type);
                return symbol?._kind === 'import' && !symbol.import.from.match(/.css$/)
                    ? 'args'
                    : 'named';
            },
            context.diagnostics,
            false
        ).forEach((mixin) => {
            const mixinRefSymbol = STSymbol.get(meta, mixin.type);
            if (
                mixinRefSymbol &&
                (mixinRefSymbol._kind === 'import' || mixinRefSymbol._kind === 'class')
            ) {
                if (mixin.partial && Object.keys(mixin.options).length === 0) {
                    context.diagnostics.warn(
                        decl,
                        diagnostics.PARTIAL_MIXIN_MISSING_ARGUMENTS(mixin.type),
                        {
                            word: mixin.type,
                        }
                    );
                }
                const refedMixin = {
                    mixin,
                    ref: mixinRefSymbol,
                };
                mixins.push(refedMixin);
                ignoreDeprecationWarn(() => meta.mixins).push(refedMixin);
            } else {
                context.diagnostics.warn(decl, diagnostics.UNKNOWN_MIXIN(mixin.type), {
                    word: mixin.type,
                });
            }
        });

        const previousMixins = ignoreDeprecationWarn(() => rule.mixins);
        if (previousMixins) {
            const partials = previousMixins.filter((r) => r.mixin.partial);
            const nonPartials = previousMixins.filter((r) => !r.mixin.partial);
            const isInPartial = decl.prop === MixinType.PARTIAL;
            if (
                (partials.length && decl.prop === MixinType.PARTIAL) ||
                (nonPartials.length && decl.prop === MixinType.ALL)
            ) {
                context.diagnostics.warn(decl, diagnostics.OVERRIDE_MIXIN(decl.prop));
            }
            if (partials.length && nonPartials.length) {
                rule.mixins = isInPartial ? nonPartials.concat(mixins) : partials.concat(mixins);
            } else if (partials.length) {
                rule.mixins = isInPartial ? mixins : partials.concat(mixins);
            } else if (nonPartials.length) {
                rule.mixins = isInPartial ? nonPartials.concat(mixins) : mixins;
            }
        } else if (mixins.length) {
            rule.mixins = mixins;
        }
    },
});
