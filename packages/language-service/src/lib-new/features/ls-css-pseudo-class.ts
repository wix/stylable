import type { CSSResolve, StylableMeta } from '@stylable/core';
import {
    MappedStates,
    nativePseudoClasses,
    StateParsedValue,
    STCustomSelector,
    STCustomState,
    TemplateStateParsedValue,
} from '@stylable/core/dist/index-internal';
import type { ImmutableSelectorNode } from '@tokey/css-selector-parser';
import path from 'node:path';
import {
    Completion,
    stateCompletion,
    stateEnumCompletion,
    range,
} from '../../lib/completion-types';
import type { LangServiceContext } from '../lang-service-context';

export function getCompletions(context: LangServiceContext): Completion[] {
    const completions: Completion[] = [];

    const selectorContext = context.getSelectorContext();

    if (!selectorContext) {
        return completions;
    }

    const {
        resolvedSelectorChain = [],
        nodeAtCursor = null,
        fullSelectorAtCursor = '',
        selectorAtCursor = '',
    } = selectorContext;

    if (selectorAtCursor === '::') {
        // No state completion directly after pseudo_element opener: bailout
        return completions;
    }

    const current = resolvedSelectorChain[resolvedSelectorChain.length - 1] || {
        // default to root
        resolved: context.stylable.resolver.resolveExtends(context.meta, 'root'),
    };
    if (current?.resolved) {
        const pos = context.getPosition();
        const states = collectStates(current.resolved);
        const isInStateParen = fullSelectorAtCursor.match(/:(.+)\((\w*)$/);
        const inStateParenDef = isInStateParen && states[isInStateParen?.[1]];
        const enumParamDef = getEnumParamDef(inStateParenDef?.def);
        if (enumParamDef) {
            // complete enum options
            const currentParam = isInStateParen![2];
            const completeFullSelector = currentParam === '';
            for (const option of enumParamDef.arguments) {
                if (typeof option !== 'string') {
                    continue;
                }
                let startDelta = 0;
                if (option.startsWith(currentParam)) {
                    // partial completion
                    startDelta = currentParam.length;
                } else if (!completeFullSelector) {
                    continue;
                }
                completions.push(
                    stateEnumCompletion(
                        option,
                        normalizeDefinitionSheetLocation(context.meta, inStateParenDef!.meta),
                        range(pos, { deltaStart: -startDelta })
                    )
                );
            }
        } else {
            // complete custom states
            const completeFullSelector = suggestCompleteStates(
                nodeAtCursor,
                selectorAtCursor,
                states,
                current.resolved
            );
            for (const [name, { def, meta }] of Object.entries(states)) {
                const isAlreadyUsed = current['pseudo_class']?.find(
                    (exist) => exist.value === name
                );
                if (isAlreadyUsed) {
                    continue;
                }
                const stateSelector = ':' + name;
                let startDelta = 0;
                if (stateSelector.startsWith(selectorAtCursor)) {
                    // partial completion
                    startDelta = selectorAtCursor.length;
                } else if (!completeFullSelector) {
                    continue;
                }
                const stateWithParam = !!(def && typeof def === 'object');
                const stateType = stateWithParam ? def.type : null;
                const originFile = normalizeDefinitionSheetLocation(context.meta, meta);
                completions.push(
                    stateCompletion(
                        name,
                        originFile,
                        range(pos, { deltaStart: -startDelta }),
                        stateType,
                        stateWithParam
                    )
                );
            }
        }
    }
    return completions;
}

function getEnumParamDef(
    stateDef?: string | StateParsedValue | TemplateStateParsedValue | null
): StateParsedValue | undefined {
    if (!stateDef || typeof stateDef !== 'object') {
        return;
    } else if (stateDef.type === 'enum') {
        return stateDef;
    } else if (STCustomState.isTemplateState(stateDef) && stateDef.params[0].type === 'enum') {
        return stateDef.params[0];
    }
    return;
}

function suggestCompleteStates(
    nodeAtCursor: ImmutableSelectorNode | null,
    selectorAtCursor: string,
    states: StatesDefs,
    resolveElement: CSSResolve[]
) {
    return (
        // prev is not a pseudo class
        nodeAtCursor?.type !== 'pseudo_class' ||
        // prev is a known native pseudo class
        nativePseudoClasses.includes(selectorAtCursor) ||
        // prev is a known custom state
        !!states[selectorAtCursor.slice(1)] ||
        // prev is a known custom selector
        !!(
            resolveElement[0] &&
            STCustomSelector.getCustomSelector(resolveElement[0].meta, selectorAtCursor.slice(3))
        )
    );
}

function normalizeDefinitionSheetLocation(originMeta: StylableMeta, defMeta: StylableMeta): string {
    if (defMeta === originMeta) {
        return 'Local file';
    }
    let relPath = path.relative(path.dirname(originMeta.source), defMeta.source);
    if (!relPath.startsWith('.')) {
        relPath = './' + relPath;
    }
    return relPath;
}

type StatesDefs = Record<string, { def: MappedStates['string']; meta: StylableMeta }>;

function collectStates(resolveChain: CSSResolve[]) {
    return resolveChain.reduce<StatesDefs>((acc, cur) => {
        const symbol = cur.symbol;
        if (symbol._kind === 'class') {
            const symbolStates = symbol[`-st-states`];

            if (symbolStates) {
                Object.keys(symbolStates).forEach((k) => {
                    const symbolStates = symbol[`-st-states`];
                    if (symbolStates && symbolStates[k] !== undefined) {
                        acc[k] = {
                            def: symbolStates[k],
                            meta: cur.meta,
                        };
                    }
                });
            }
        }
        return acc;
    }, {});
}
