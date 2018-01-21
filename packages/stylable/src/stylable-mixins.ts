import * as  postcss from 'postcss';
import { resolveArgumentsValue } from './functions';
import { cssObjectToAst } from './parser';
import { ClassSymbol, ImportSymbol, RefedMixin, SRule, StylableMeta } from './stylable-processor';
import { CSSResolve, JSResolve } from './stylable-resolver';
import { StylableTransformer } from './stylable-transformer';
import { createSubsetAst, findDeclaration, isValidDeclaration, mergeRules } from './stylable-utils';
import { MixinValue, valueMapping } from './stylable-value-parsers';
import { Pojo } from './types';

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

    const resolvedMixin = transformer.resolver.deepResolve(mix.ref);

    if (resolvedMixin) {
        if (resolvedMixin._kind === 'js') {
            if (typeof resolvedMixin.symbol === 'function') {
                try {
                    handleJSMixin(transformer, mix.mixin, resolvedMixin.symbol, meta, rule, variableOverride);
                } catch (e) {
                    transformer.diagnostics.error(rule, 'could not apply mixin: ' + e, { word: mix.mixin.type });
                    return;
                }
            } else {
                transformer.diagnostics.error(rule, 'js mixin must be a function', { word: mix.mixin.type });
            }
        } else {
            const resolvedClass = transformer.resolver.deepResolve(mix.ref);
            if (resolvedClass && resolvedClass.symbol && resolvedClass._kind === 'css') {
                handleImportedCSSMixin(
                    transformer,
                    mix,
                    rule,
                    meta,
                    resolvedClass,
                    path,
                    variableOverride
                );
            } else {
                const importNode = findDeclaration(
                    (mix.ref as ImportSymbol).import, (node: any) => node.prop === valueMapping.named);
                transformer.diagnostics.error(importNode, 'import mixin does not exist', { word: importNode.value });
            }
        }
    } else if (mix.ref._kind === 'class') {
        handleLocalClassMixin(mix, transformer, meta, variableOverride, path, rule);
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
        transformer.diagnostics.warn(rule, `circular mixin found: ${path.join(' --> ')}`, { word: mix.ref.name });
        // TODO: add warn
        return true;
    }
    return false;
}

function handleJSMixin(
    transformer: StylableTransformer,
    mixin: MixinValue,
    mixinFunction: (...args: any[]) => any,
    meta: StylableMeta,
    rule: postcss.Rule,
    variableOverride?: Pojo<string>) {

    const res = mixinFunction((mixin.options as any[]).map(v => v.value));
    const mixinRoot = cssObjectToAst(res).root;

    mixinRoot.walkDecls(decl => {
        if (!isValidDeclaration(decl)) {
            decl.value = String(decl);
        }
    });

    transformer.transformAst(mixinRoot, meta, undefined, variableOverride);

    mergeRules(mixinRoot, rule);

}

function handleImportedCSSMixin(
    transformer: StylableTransformer,
    mix: RefedMixin,
    rule: postcss.Rule,
    meta: StylableMeta,
    resolvedClass: CSSResolve,
    path: string[],
    variableOverride?: Pojo<string>) {

    const mixinRoot = createSubsetAst<postcss.Root>(
        resolvedClass.meta.ast,
        (resolvedClass.symbol._kind === 'class' ? '.' : '') + resolvedClass.symbol.name,
        undefined,
        resolvedClass.symbol.name === resolvedClass.meta.root
    );

    const namedArgs = mix.mixin.options as Pojo<string>;
    const resolvedArgs = resolveArgumentsValue(namedArgs, transformer, meta, variableOverride, path);

    transformer.transformAst(
        mixinRoot,
        resolvedClass.meta,
        undefined,
        resolvedArgs,
        path.concat(mix.ref.name + ' from ' + meta.source)
    );

    mergeRules(
        mixinRoot,
        rule
    );
}

function handleLocalClassMixin(
    mix: RefedMixin,
    transformer: StylableTransformer,
    meta: StylableMeta,
    variableOverride: ({ [key: string]: string; } & object) | undefined,
    path: string[],
    rule: SRule) {

    const namedArgs = mix.mixin.options as Pojo<string>;
    const resolvedArgs = resolveArgumentsValue(namedArgs, transformer, meta, variableOverride, path);
    const mixinRoot = createSubsetAst<postcss.Root>(meta.ast, '.' + mix.ref.name);
    transformer.transformAst(mixinRoot,
        meta,
        undefined,
        resolvedArgs,
        path.concat(mix.ref.name + ' from ' + meta.source)
    );
    mergeRules(mixinRoot, rule);
}
