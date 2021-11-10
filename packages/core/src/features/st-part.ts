import { createFeature, SelectorNodeContext } from './feature';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import * as CSSClass from './css-class';
import * as CSSType from './css-type';
import { plugableRecord } from '../helpers/plugable-record';
import { findRule } from '../helpers/rule';
import { ignoreDeprecationWarn } from '../helpers/deprecation';
import type { StylableMeta } from '../stylable-meta';
import type { CSSResolve, StylableResolver } from '../stylable-resolver';
import type { ImmutableClass, ImmutableType } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

export interface StylablePart {
    symbol: ClassSymbol | ElementSymbol;
    node: postcss.Rule | postcss.Root;
}

const dataKey = plugableRecord.key<Record<string, StylablePart>>();

export const diagnostics = {
    // -st-extends
    IMPORT_ISNT_EXTENDABLE() {
        return 'import is not extendable';
    },
    CANNOT_EXTEND_UNKNOWN_SYMBOL(name: string) {
        return `cannot extend unknown symbol "${name}"`;
    },
    CANNOT_EXTEND_JS() {
        return 'JS import is not extendable';
    },
    UNKNOWN_IMPORT_ALIAS(name: string) {
        return `cannot use alias for unknown import "${name}"`;
    },
};

// HOOKS

export const hooks = createFeature({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
    },
    analyzeSelectorNode<AST extends ImmutableClass | ImmutableType>(
        meta: StylableMeta,
        node: AST,
        rule: postcss.Rule,
        nodeContext: SelectorNodeContext
    ): void {
        const stPartData = plugableRecord.getUnsafe(meta.data, dataKey);
        const name = node.value;
        if (node.type === `class`) {
            CSSClass.hooks.analyzeSelectorNode(meta, node, rule);
        } else {
            CSSType.hooks.analyzeSelectorNode(meta, node, rule, nodeContext);
        }
        if (!stPartData[name]) {
            const symbol =
                node.type === `class` ? CSSClass.getClass(meta, name) : CSSType.getType(meta, name);
            if (!symbol) {
                return;
            }
            stPartData[name] = {
                node: rule,
                symbol,
            };
            // deprecated
            ignoreDeprecationWarn(() => {
                meta.simpleSelectors[name] = stPartData[name];
            });
        }
    },
});

// API

export function getPart(meta: StylableMeta, name: string): StylablePart | undefined {
    const state = plugableRecord.getUnsafe(meta.data, dataKey);
    return state[name];
}

export function resolveAll(meta: StylableMeta, resolver: StylableResolver) {
    const resolvedClasses: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>> = {};
    for (const [className, classSymbol] of Object.entries(CSSClass.getSymbols(meta))) {
        resolvedClasses[className] = resolver.resolveExtends(
            meta,
            className,
            false,
            undefined,
            (res, extend) => {
                const decl = findRule(meta.ast, '.' + className);
                if (decl) {
                    // ToDo: move to STExtends
                    if (res && res._kind === 'js') {
                        meta.diagnostics.error(decl, diagnostics.CANNOT_EXTEND_JS(), {
                            word: decl.value,
                        });
                    } else if (res && !res.symbol) {
                        meta.diagnostics.error(
                            decl,
                            diagnostics.CANNOT_EXTEND_UNKNOWN_SYMBOL(extend.name),
                            { word: decl.value }
                        );
                    } else {
                        meta.diagnostics.error(decl, diagnostics.IMPORT_ISNT_EXTENDABLE(), {
                            word: decl.value,
                        });
                    }
                } else {
                    if (classSymbol.alias) {
                        meta.ast.walkRules(new RegExp('\\.' + className), (rule) => {
                            meta.diagnostics.error(
                                rule,
                                diagnostics.UNKNOWN_IMPORT_ALIAS(className),
                                { word: className }
                            );
                            return false;
                        });
                    }
                }
            }
        );
    }

    const resolvedElements: Record<string, Array<CSSResolve<ClassSymbol | ElementSymbol>>> = {};
    for (const k of Object.keys(CSSType.getSymbols(meta))) {
        resolvedElements[k] = resolver.resolveExtends(meta, k, true);
    }
    return { class: resolvedClasses, element: resolvedElements };
}
