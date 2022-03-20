import { dirname } from 'path';
import * as postcss from 'postcss';
import type { Diagnostics } from './diagnostics';
import { resolveArgumentsValue } from './functions';
import { cssObjectToAst } from './parser';
import { fixRelativeUrls } from './stylable-assets';
import type { StylableMeta } from './stylable-meta';
import { RefedMixin, ImportSymbol, STSymbol, ClassSymbol, ElementSymbol } from './features';
import type { FeatureTransformContext } from './features/feature';
import type { SRule } from './deprecated/postcss-ast-extension';
import type { CSSResolve } from './stylable-resolver';
import type { StylableTransformer } from './stylable-transformer';
import { createSubsetAst } from './helpers/rule';
import { strategies } from './helpers/value';
import { isValidDeclaration, mergeRules } from './stylable-utils';
import { valueMapping, mixinDeclRegExp } from './stylable-value-parsers';
import { ignoreDeprecationWarn } from './helpers/deprecation';

export const mixinWarnings = {
    FAILED_TO_APPLY_MIXIN(error: string) {
        return `could not apply mixin: ${error}`;
    },
    JS_MIXIN_NOT_A_FUNC() {
        return `js mixin must be a function`;
    },
    CIRCULAR_MIXIN(circularPaths: string[]) {
        return `circular mixin found: ${circularPaths.join(' --> ')}`;
    },
    UNKNOWN_MIXIN_SYMBOL(name: string) {
        return `cannot mixin unknown symbol "${name}"`;
    },
};

export function appendMixins(
    context: FeatureTransformContext,
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>,
    path: string[] = []
) {
    const mixins = ignoreDeprecationWarn(() => rule.mixins);
    if (!mixins || mixins.length === 0) {
        return;
    }
    mixins.forEach((mix) => {
        appendMixin(context, mix, transformer, rule, meta, variableOverride, cssVarsMapping, path);
    });
    mixins.length = 0;
    rule.walkDecls(mixinDeclRegExp, (node) => {
        node.remove();
    });
}

export function appendMixin(
    context: FeatureTransformContext,
    mix: RefedMixin,
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>,
    path: string[] = []
) {
    if (checkRecursive(context.diagnostics, meta, mix, rule, path)) {
        return;
    }

    const local = STSymbol.get(meta, mix.mixin.type);
    if (local && (local._kind === 'class' || local._kind === 'element')) {
        handleLocalClassMixin(
            reParseMixinNamedArgs(mix, rule, context.diagnostics),
            transformer,
            meta,
            variableOverride,
            cssVarsMapping,
            path,
            rule
        );
    } else {
        const resolvedSymbols = context.getResolvedSymbols(meta);
        const symbolName = mix.mixin.type;
        const resolvedType = resolvedSymbols.mainNamespace[symbolName];
        if (resolvedType === `class`) {
            const resolveChain = resolvedSymbols.class[symbolName];
            handleImportedCSSMixin(
                resolveChain,
                transformer,
                reParseMixinNamedArgs(mix, rule, context.diagnostics),
                rule,
                meta,
                path,
                variableOverride,
                cssVarsMapping
            );
            return;
        } else if (resolvedType === `js`) {
            const resolvedMixin = resolvedSymbols.js[symbolName];
            if (typeof resolvedMixin.symbol === 'function') {
                try {
                    handleJSMixin(
                        transformer,
                        reParseMixinArgs(mix, rule, context.diagnostics),
                        resolvedMixin.symbol,
                        meta,
                        rule,
                        variableOverride
                    );
                } catch (e) {
                    context.diagnostics.error(
                        rule,
                        mixinWarnings.FAILED_TO_APPLY_MIXIN(String(e)),
                        { word: mix.mixin.type }
                    );
                    return;
                }
            } else {
                context.diagnostics.error(rule, mixinWarnings.JS_MIXIN_NOT_A_FUNC(), {
                    word: mix.mixin.type,
                });
            }
            return;
        }

        // ToDo: report on unsupported mixed in symbol type
        const mixinDecl = getMixinDeclaration(rule);
        if (mixinDecl) {
            // ToDo: report on rule if decl is not found
            context.diagnostics.error(
                mixinDecl,
                mixinWarnings.UNKNOWN_MIXIN_SYMBOL(mixinDecl.value),
                { word: mixinDecl.value }
            );
        }
    }
}

function checkRecursive(
    diagnostics: Diagnostics,
    meta: StylableMeta,
    mix: RefedMixin,
    rule: postcss.Rule,
    path: string[]
) {
    const symbolName =
        mix.ref.name === meta.root
            ? mix.ref._kind === 'class'
                ? meta.root
                : 'default'
            : mix.mixin.type;
    const isRecursive = path.includes(symbolName + ' from ' + meta.source);
    if (isRecursive) {
        // Todo: add test verifying word
        diagnostics.warn(rule, mixinWarnings.CIRCULAR_MIXIN(path), {
            word: symbolName,
        });
        return true;
    }
    return false;
}

function handleJSMixin(
    transformer: StylableTransformer,
    mix: RefedMixin,
    mixinFunction: (...args: any[]) => any,
    meta: StylableMeta,
    rule: postcss.Rule,
    variableOverride?: Record<string, string>
) {
    const res = mixinFunction((mix.mixin.options as any[]).map((v) => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls((decl) => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    transformer.transformAst(mixinRoot, meta, undefined, variableOverride, [], true);
    const mixinPath = (mix.ref as ImportSymbol).import.request;
    fixRelativeUrls(
        mixinRoot,
        transformer.resolver.resolvePath(dirname(meta.source), mixinPath),
        meta.source
    );

    mergeRules(mixinRoot, rule);
}

function createMixinRootFromCSSResolve(
    transformer: StylableTransformer,
    mix: RefedMixin,
    meta: StylableMeta,
    resolvedClass: CSSResolve,
    path: string[],
    decl: postcss.Declaration,
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>
) {
    const isRootMixin = resolvedClass.symbol.name === resolvedClass.meta.root;
    const mixinRoot = createSubsetAst<postcss.Root>(
        resolvedClass.meta.ast,
        (resolvedClass.symbol._kind === 'class' ? '.' : '') + resolvedClass.symbol.name,
        undefined,
        isRootMixin
    );

    const namedArgs = mix.mixin.options as Record<string, string>;

    if (mix.mixin.partial) {
        filterPartialMixinDecl(meta, mixinRoot, Object.keys(namedArgs));
    }

    const resolvedArgs = resolveArgumentsValue(
        namedArgs,
        transformer,
        meta,
        transformer.diagnostics,
        decl,
        variableOverride,
        path,
        cssVarsMapping
    );

    const mixinMeta: StylableMeta = isRootMixin
        ? resolvedClass.meta
        : createInheritedMeta(resolvedClass);
    const symbolName = isRootMixin ? 'default' : mix.mixin.type;

    transformer.transformAst(
        mixinRoot,
        mixinMeta,
        undefined,
        resolvedArgs,
        path.concat(symbolName + ' from ' + meta.source),
        true,
        resolvedClass.symbol.name
    );

    fixRelativeUrls(mixinRoot, mixinMeta.source, meta.source);

    return mixinRoot;
}

function handleImportedCSSMixin(
    resolveChain: CSSResolve<ClassSymbol | ElementSymbol>[],
    transformer: StylableTransformer,
    mix: RefedMixin,
    rule: postcss.Rule,
    meta: StylableMeta,
    path: string[],
    variableOverride: Record<string, string>,
    cssVarsMapping: Record<string, string>
) {
    const isPartial = mix.mixin.partial;
    const namedArgs = mix.mixin.options as Record<string, string>;
    const overrideKeys = Object.keys(namedArgs);

    if (isPartial && overrideKeys.length === 0) {
        return;
    }

    const mixinDecl = getMixinDeclaration(rule) || postcss.decl();

    const roots = [];
    // start from 1 to ignore the local symbol - just mix the imported parts
    for (let i = 1; i < resolveChain.length; ++i) {
        const resolved = resolveChain[i];
        roots.push(
            createMixinRootFromCSSResolve(
                transformer,
                mix,
                meta,
                resolved,
                path,
                mixinDecl,
                variableOverride,
                cssVarsMapping
            )
        );
        if (resolved.symbol[valueMapping.extends]) {
            break;
        }
    }

    if (roots.length === 1) {
        mergeRules(roots[0], rule);
    } else if (roots.length > 1) {
        const mixinRoot = postcss.root();
        roots.forEach((root) => mixinRoot.prepend(...root.nodes));
        mergeRules(mixinRoot, rule);
    }
}

function handleLocalClassMixin(
    mix: RefedMixin,
    transformer: StylableTransformer,
    meta: StylableMeta,
    variableOverride: ({ [key: string]: string } & object) | undefined,
    cssVarsMapping: Record<string, string>,
    path: string[],
    rule: SRule
) {
    const isPartial = mix.mixin.partial;
    const namedArgs = mix.mixin.options as Record<string, string>;
    const overrideKeys = Object.keys(namedArgs);

    if (isPartial && overrideKeys.length === 0) {
        return;
    }
    const isRootMixin = mix.ref.name === meta.root;
    const mixinDecl = getMixinDeclaration(rule) || postcss.decl();
    const resolvedArgs = resolveArgumentsValue(
        namedArgs,
        transformer,
        meta,
        transformer.diagnostics,
        mixinDecl,
        variableOverride,
        path,
        cssVarsMapping
    );

    const mixinRoot = createSubsetAst<postcss.Root>(
        meta.ast,
        '.' + mix.ref.name,
        undefined,
        isRootMixin
    );

    if (isPartial) {
        filterPartialMixinDecl(meta, mixinRoot, overrideKeys);
    }

    transformer.transformAst(
        mixinRoot,
        isRootMixin ? meta : createInheritedMeta({ meta, symbol: mix.ref, _kind: 'css' }),
        undefined,
        resolvedArgs,
        path.concat(mix.mixin.type + ' from ' + meta.source),
        true,
        mix.ref.name
    );
    mergeRules(mixinRoot, rule);
}

function createInheritedMeta({ meta }: CSSResolve) {
    const mixinMeta: StylableMeta = Object.create(meta);
    mixinMeta.data = { ...meta.data };
    mixinMeta.parent = meta;
    STSymbol.inheritSymbols(meta, mixinMeta);
    return mixinMeta;
}

function getMixinDeclaration(rule: postcss.Rule): postcss.Declaration | undefined {
    return (
        rule.nodes &&
        (rule.nodes.find((node) => {
            return (
                node.type === 'decl' &&
                (node.prop === valueMapping.mixin || node.prop === valueMapping.partialMixin)
            );
        }) as postcss.Declaration)
    );
}
const partialsOnly = ({ mixin: { partial } }: RefedMixin): boolean => {
    return !!partial;
};
const nonPartials = ({ mixin: { partial } }: RefedMixin): boolean => {
    return !partial;
};

/** we assume that mixinRoot is freshly created nodes from the ast */
function filterPartialMixinDecl(
    meta: StylableMeta,
    mixinRoot: postcss.Root,
    overrideKeys: string[]
) {
    let regexp: RegExp;
    const overrideSet = new Set(overrideKeys);
    let size;
    do {
        size = overrideSet.size;
        regexp = new RegExp(`value\\((\\s*${Array.from(overrideSet).join('\\s*)|(\\s*')}\\s*)\\)`);
        for (const { text, name } of Object.values(meta.getAllStVars())) {
            if (!overrideSet.has(name) && text.match(regexp)) {
                overrideSet.add(name);
            }
        }
    } while (overrideSet.size !== size);

    mixinRoot.walkDecls((decl) => {
        if (!decl.value.match(regexp)) {
            const parent = decl.parent as SRule; // ref the parent before remove
            decl.remove();
            if (parent?.nodes?.length === 0) {
                parent.remove();
            } else if (parent) {
                if (decl.prop === valueMapping.mixin) {
                    parent.mixins = parent.mixins!.filter(partialsOnly);
                } else if (decl.prop === valueMapping.partialMixin) {
                    parent.mixins = parent.mixins!.filter(nonPartials);
                }
            }
        }
    });
}

/** this is a workaround for parsing the mixin args too early  */
function reParseMixinNamedArgs(
    mix: RefedMixin,
    rule: postcss.Rule,
    diagnostics: Diagnostics
): RefedMixin {
    const options =
        mix.mixin.valueNode?.type === 'function'
            ? strategies.named(mix.mixin.valueNode, (message, options) => {
                  diagnostics.warn(mix.mixin.originDecl || rule, message, options);
              })
            : (mix.mixin.options as Record<string, string>) || {};

    return {
        ...mix,
        mixin: {
            ...mix.mixin,
            options,
        },
    };
}

function reParseMixinArgs(
    mix: RefedMixin,
    rule: postcss.Rule,
    diagnostics: Diagnostics
): RefedMixin {
    const options =
        mix.mixin.valueNode?.type === 'function'
            ? strategies.args(mix.mixin.valueNode, (message, options) => {
                  diagnostics.warn(mix.mixin.originDecl || rule, message, options);
              })
            : Array.isArray(mix.mixin.options)
            ? (mix.mixin.options as { value: string }[])
            : [];

    return {
        ...mix,
        mixin: {
            ...mix.mixin,
            options,
        },
    };
}
