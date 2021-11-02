import type * as postcss from 'postcss';
import type { Diagnostics } from '../diagnostics';
import { parseSelectorWithCache } from './selector';
import type { StylableMeta } from '../stylable-meta';
import type { StylableResolver } from '../stylable-resolver';
import { valueMapping } from '../stylable-value-parsers';
import { validateStateArgument } from '../pseudo-states';
import { CSSClass } from '../features';

export function validateRuleStateDefinition(
    rule: postcss.Rule,
    meta: StylableMeta,
    resolver: StylableResolver,
    diagnostics: Diagnostics
) {
    const parentRule = rule;
    const selectorAst = parseSelectorWithCache(parentRule.selector);
    if (selectorAst.length && selectorAst.length === 1) {
        const singleSelectorAst = selectorAst[0];
        const selectorChunk = singleSelectorAst.nodes;
        if (selectorChunk.length === 1 && selectorChunk[0].type === 'class') {
            const className = selectorChunk[0].value;
            const classMeta = CSSClass.getClass(meta, className)!;
            const states = classMeta[valueMapping.states];

            if (classMeta && classMeta._kind === 'class' && states) {
                for (const stateName in states) {
                    // TODO: Sort out types
                    const state = states[stateName];
                    if (state && typeof state === 'object') {
                        const { errors } = validateStateArgument(
                            state,
                            meta,
                            state.defaultValue || '',
                            resolver,
                            diagnostics,
                            parentRule,
                            true,
                            !!state.defaultValue
                        );
                        if (errors) {
                            errors.unshift(
                                `pseudo-state "${stateName}" default value "${state.defaultValue}" failed validation:`
                            );
                            rule.walkDecls((decl) => {
                                if (decl.prop === valueMapping[`states`]) {
                                    diagnostics.warn(decl, errors.join('\n'), {
                                        word: decl.value,
                                    });
                                    return false;
                                }
                                return;
                            });
                        }
                    }
                }
            } else {
                // TODO: error state on non-class
            }
        }
    }
}
