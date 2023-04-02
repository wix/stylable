import {
    PseudoClass,
    Selector,
    SelectorList,
    walk,
    SelectorNode,
    parseCssSelector,
} from '@tokey/css-selector-parser';
import cloneDeep from 'lodash.clonedeep';

export type CustomSelectorMap = Record<string, SelectorList>;
type InsertionIter = (progress: boolean) => boolean;
type UnknownReport = { type: 'unknown'; origin: string; unknown: string };
type CircularReport = { type: 'circular'; path: readonly string[] };
export type TransformCustomSelectorReport = UnknownReport | CircularReport;

export function transformInlineCustomSelectorMap(
    customSelectors: CustomSelectorMap,
    report: (data: TransformCustomSelectorReport) => void
) {
    const result: CustomSelectorMap = {};
    const link = (name: string, path: string[]) => {
        const ast = customSelectors[name];
        if (!ast) {
            return;
        }
        result[name] = transformInlineCustomSelectors(
            ast,
            (nestedName) => {
                const selector = `:--${nestedName}`;
                if (path.includes(selector)) {
                    // loop!: report & preserve source selector
                    report({ type: 'circular', path });
                    return parseCssSelector(selector);
                }
                if (!result[nestedName]) {
                    link(nestedName, [...path, selector]);
                }
                return result[nestedName];
            },
            ({ type, unknown }) => report({ type, origin: name, unknown })
        );
    };
    for (const name of Object.keys(customSelectors)) {
        link(name, [`:--${name}`]);
    }
    return result;
}

function isCustomSelectorNode(node: SelectorNode): node is PseudoClass {
    return node.type === 'pseudo_class' && node.value.startsWith('--');
}

/**
 * Takes a list of selectors and a function that returns a selector
 * against a custom selector name.
 *
 * Then search for inline custom selectors (e.g. ":--custom") and
 * replaces them with the retrieved selectors it receives
 */
export function transformInlineCustomSelectors(
    inputSelectors: SelectorList,
    getCustomSelector: (name: string) => SelectorList | undefined,
    report: (data: UnknownReport) => void
): SelectorList {
    const result: SelectorList = [];
    for (const selector of inputSelectors) {
        result.push(...transformInlineCustomSelector(selector, getCustomSelector, report));
    }
    return result;
}

function transformInlineCustomSelector(
    inputSelector: Selector,
    getCustomSelector: (name: string) => SelectorList | undefined,
    report: (data: UnknownReport) => void
): SelectorList {
    const insertions: InsertionIter[] = [];
    // get insertion points
    walk(inputSelector, (node, index, _nodes, parents) => {
        if (isCustomSelectorNode(node)) {
            const name = node.value.slice(2);
            const targetSelectors = getCustomSelector(name);
            if (!targetSelectors) {
                report({ type: 'unknown', origin: '', unknown: name });
            } else if (targetSelectors.length !== 0) {
                const parent = parents[parents.length - 1];
                if (parent && 'nodes' in parent && parent.nodes) {
                    let selectorIndex = 0;
                    insertions.push((progress) => {
                        if (progress) {
                            selectorIndex++;
                        }
                        const overflow = selectorIndex === targetSelectors.length;
                        if (overflow) {
                            selectorIndex = 0;
                        }
                        const currentSelector = targetSelectors[selectorIndex];
                        currentSelector.before = currentSelector.after = '';
                        parent.nodes![index] = currentSelector;
                        return overflow;
                    });
                }
            }
        }
    });
    // permute selectors
    const output: SelectorList = [];
    if (insertions.length) {
        // save first permutation
        insertions.forEach((updateSelector) => updateSelector(false));
        output.push(cloneDeep(inputSelector));
        // collect rest of permutations
        let run = true;
        while (run) {
            let progressIdx = 0;
            for (let i = 0; i < insertions.length; ++i) {
                const updateSelector = insertions[i];
                const moveToNext = i === progressIdx;
                const overflow = updateSelector(moveToNext);
                if (overflow) {
                    if (progressIdx < insertions.length - 1) {
                        // advance next insertion point
                        progressIdx++;
                    } else {
                        // finish run over all permutations
                        run = false;
                        return output;
                    }
                } else {
                    // no need to update any farther this round
                    break;
                }
            }
            output.push(cloneDeep(inputSelector));
        }
    }
    return [inputSelector];
}
