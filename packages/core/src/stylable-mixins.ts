import postcss from 'postcss';
import { resolveArgumentsValue } from './functions';
import { cssObjectToAst } from './parser';
import { fixRelativeUrls } from './stylable-assets';
import { ImportSymbol, RefedMixin, SRule, StylableMeta } from './stylable-processor';
import { CSSResolve } from './stylable-resolver';
import { StylableTransformer } from './stylable-transformer';
import { createSubsetAst, findDeclaration, isValidDeclaration, mergeRules } from './stylable-utils';
import { valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';

/* tslint:disable:max-line-length */
export const mixinWarnings = {
    FAILED_TO_APPLY_MIXIN(error: string) { return `could not apply mixin: ${error}`; },
    JS_MIXIN_NOT_A_FUNC() { return `js mixin must be a function`; },
    CIRCULAR_MIXIN(circularPaths: string[]) { return `circular mixin found: ${circularPaths.join(' --> ')}`; },
    UNKNOWN_MIXIN_SYMBOL(name: string) { return `cannot mixin unknown symbol "${name}"`; }
};
/* tslint:enable:max-line-length */

export function appendMixins(
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride?: Pojo<string>,
    path: string[] = []) {

    if (!rule.mixins || rule.mixins.length === 0) { return; }
    rule.mixins.forEach(mix => {
        appendMixin(mix, transformer, rule, meta, variableOverride, path);
    });
    rule.mixins.length = 0;
    rule.walkDecls(valueMapping.mixin, node => node.remove());
}

export function appendMixin(
    mix: RefedMixin,
    transformer: StylableTransformer,
    rule: SRule,
    meta: StylableMeta,
    variableOverride?: Pojo<string>,
    path: string[] = []) {

    if (checkRecursive(transformer, meta, mix, rule, path)) { return; }

    const local = meta.mappedSymbols[mix.ref.name];
    if (local && (local._kind === 'class' || local._kind === 'element')) {
        handleLocalClassMixin(mix, transformer, meta, variableOverride, path, rule);
    } else {
        const resolvedMixin = transformer.resolver.resolve(mix.ref);
        if (resolvedMixin) {
            if (resolvedMixin._kind === 'js') {
                if (typeof resolvedMixin.symbol === 'function') {
                    try {
                        handleJSMixin(transformer, mix, resolvedMixin.symbol, meta, rule, variableOverride);
                    } catch (e) {
                        transformer.diagnostics.error(
                            rule,
                            mixinWarnings.FAILED_TO_APPLY_MIXIN(e),
                            { word: mix.mixin.type });
                        return;
                    }
                } else {
                    transformer.diagnostics.error(rule, mixinWarnings.JS_MIXIN_NOT_A_FUNC(), { word: mix.mixin.type });
                }
            } else {
                handleImportedCSSMixin(
                    transformer,
                    mix,
                    rule,
                    meta,
                    path,
                    variableOverride
                );
            }
        } else {
            // TODO: error cannot resolve mixin
        }
    }
}

function checkRecursive(
    transformer: StylableTransformer,
    meta: StylableMeta,
    mix: RefedMixin,
    rule: postcss.Rule,
    path: string[]) {

    const isRecursive = path.indexOf(mix.ref.name + ' from ' + meta.source) !== -1;
    if (isRecursive) {
        transformer.diagnostics.warn(rule, mixinWarnings.CIRCULAR_MIXIN(path), { word: mix.ref.name });
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
    variableOverride?: Pojo<string>) {

    const res = mixinFunction((mix.mixin.options as any[]).map(v => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls(decl => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    transformer.transformAst(
        mixinRoot,
        meta,
        undefined,
        variableOverride
    );

    fixRelativeUrls(mixinRoot, mix, meta);

    mergeRules(mixinRoot, rule);

}

function createMixinRootFromCSSResolve(
    transformer: StylableTransformer,
    mix: RefedMixin,
    meta: StylableMeta,
    resolvedClass: CSSResolve,
    path: string[],
    decl: postcss.Declaration,
    variableOverride?: Pojo<string>) {

    const isRootMixin = resolvedClass.symbol.name === resolvedClass.meta.root;
    const mixinRoot = createSubsetAst<postcss.Root>(
        resolvedClass.meta.ast,
        (resolvedClass.symbol._kind === 'class' ? '.' : '') + resolvedClass.symbol.name,
        undefined,
        isRootMixin
    );

    const namedArgs = mix.mixin.options as Pojo<string>;
    const resolvedArgs = resolveArgumentsValue(
        namedArgs,
        transformer,
        meta,
        transformer.diagnostics,
        decl,
        variableOverride,
        path
    );

    const mixinMeta: StylableMeta = isRootMixin ? resolvedClass.meta : createInheritedMeta(resolvedClass);

    transformer.transformAst(
        mixinRoot,
        mixinMeta,
        undefined,
        resolvedArgs,
        path.concat(mix.ref.name + ' from ' + meta.source)
    );

    fixRelativeUrls(mixinRoot, mix, meta);

    return mixinRoot;
}

function handleImportedCSSMixin(
    transformer: StylableTransformer,
    mix: RefedMixin,
    rule: postcss.Rule,
    meta: StylableMeta,
    path: string[],
    variableOverride?: Pojo<string>) {

    let resolvedClass = transformer.resolver.resolve(mix.ref) as CSSResolve;
    const roots = [];

    while (resolvedClass && resolvedClass.symbol && resolvedClass._kind === 'css') {
        const mixinDecl = getMixinDeclaration(rule) || postcss.decl();
        roots.push(createMixinRootFromCSSResolve(
            transformer,
            mix,
            meta,
            resolvedClass,
            path,
            mixinDecl,
            variableOverride));
        if (
            (resolvedClass.symbol._kind === 'class' || resolvedClass.symbol._kind === 'element') &&
            !resolvedClass.symbol[valueMapping.extends]
        ) {
            resolvedClass = transformer.resolver.resolve(resolvedClass.symbol) as CSSResolve;
        } else {
            break;
        }
    }

    if (roots.length) {
        const mixinRoot = postcss.root();
        roots.forEach(root => mixinRoot.prepend(...root.nodes!));
        mergeRules(mixinRoot, rule);
    } else {
        const mixinDecl = getMixinDeclaration(rule);

        if (mixinDecl) {
            transformer.diagnostics.error(
                mixinDecl,
                mixinWarnings.UNKNOWN_MIXIN_SYMBOL(mixinDecl.value),
                { word: mixinDecl.value }
            );
        }
    }
}

function handleLocalClassMixin(
    mix: RefedMixin,
    transformer: StylableTransformer,
    meta: StylableMeta,
    variableOverride: ({ [key: string]: string; } & object) | undefined,
    path: string[],
    rule: SRule) {

    const isRootMixin = mix.ref.name === meta.root;
    const namedArgs = mix.mixin.options as Pojo<string>;
    const mixinDecl = getMixinDeclaration(rule) || postcss.decl();
    const resolvedArgs = resolveArgumentsValue(namedArgs,
        transformer,
        meta,
        transformer.diagnostics,
        mixinDecl,
        variableOverride,
        path
    );

    const mixinRoot = createSubsetAst<postcss.Root>(meta.ast, '.' + mix.ref.name, undefined, isRootMixin);

    transformer.transformAst(
        mixinRoot,
        isRootMixin ? meta : createInheritedMeta({ meta, symbol: mix.ref, _kind: 'css' }),
        undefined,
        resolvedArgs,
        path.concat(mix.ref.name + ' from ' + meta.source)
    );
    mergeRules(mixinRoot, rule);
}

function createInheritedMeta(resolvedClass: CSSResolve) {
    const mixinMeta: StylableMeta = Object.create(resolvedClass.meta);
    mixinMeta.parent = resolvedClass.meta;
    mixinMeta.mappedSymbols = Object.create(resolvedClass.meta.mappedSymbols);
    mixinMeta.mappedSymbols[resolvedClass.meta.root] = resolvedClass.meta.mappedSymbols[resolvedClass.symbol.name];
    return mixinMeta;
}

function getMixinDeclaration(rule: postcss.Rule): postcss.Declaration | undefined {
    return (rule.nodes && rule.nodes.find(node => {
        return node.type === 'decl' && node.prop === valueMapping.mixin;
    }) as postcss.Declaration);
}
