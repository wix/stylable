import parser, { Root as SelectorAstRoot, Selector, Pseudo, Node } from 'postcss-selector-parser';
import { AtRule, Rule } from 'postcss';

export function expandCustomSelectorsRules(
    rule: Rule,
    customSelectors: Record<string, SelectorAstRoot>
): string {
    const selector = parser((selectors) =>
        transformSelectorList(selectors, customSelectors)
    ).processSync(rule.selector, { lossless: true });

    return selector;
}

export function processCustomSelector(node: AtRule) {
    if (customSelectorParamsRegExp.test(node.params)) {
        const [, name, selectors] = node.params.match(customSelectorParamsRegExp)!;
        return {
            name: name,
            ast: parser().astSync(selectors, { lossless: true }),
            selectors,
        };
    }
    return undefined;
}

// match the custom selector params
const customSelectorParamsRegExp = /^(:--[\w-]*)\s+([\S\s]+)\s*$/;

// return transformed selectors, replacing custom pseudo selectors with custom selectors
export function transformSelectorList(
    selectorList: SelectorAstRoot | Selector | Pseudo,
    customSelectors: Record<string, SelectorAstRoot>
) {
    let index = selectorList.nodes.length;

    while (index--) {
        const node = selectorList.nodes[index];
        const transformedSelectors = transformSelector(node, customSelectors);
        if (transformedSelectors.length) {
            selectorList.nodes.splice(index, 1, ...transformedSelectors);
        }
    }

    return selectorList;
}

// return custom pseudo selectors replaced with custom selectors
function transformSelector(selector: Node, customSelectors: Record<string, SelectorAstRoot>) {
    const transpiledSelectors: Array<Selector> = [];
    if (!('nodes' in selector)) {
        return transpiledSelectors;
    }
    for (let index = 0; index < selector.nodes.length; index++) {
        const node = selector.nodes[index];
        const customSelectorAst = customSelectors[node.value!];
        if (customSelectorAst) {
            for (const replacementSelector of customSelectorAst.nodes) {
                const selectorClone = selector.clone({}) as Selector;
                const replacementSelectorClone = replacementSelector.clone({}) as Selector;
                if (index !== 0) {
                    replacementSelectorClone.nodes[0].spaces.before = '';
                }
                selectorClone.nodes.splice(index, 1, ...replacementSelectorClone.nodes);

                const retranspiledSelectors = transformSelector(selectorClone, customSelectors);

                if (retranspiledSelectors.length) {
                    transpiledSelectors.push(...retranspiledSelectors);
                } else {
                    adjustNodesBySelectorEnds(selectorClone.nodes, index);
                    transpiledSelectors.push(selectorClone);
                }
            }

            return transpiledSelectors;
        } else if ('nodes' in node && node.nodes.length) {
            transformSelectorList(node, customSelectors);
        }
    }

    return transpiledSelectors;
}

// match selectors by difficult-to-separate ends
const withoutSelectorStartMatch = /^(tag|universal)$/;
const withoutSelectorEndMatch = /^(class|id|pseudo|tag|universal)$/;

const isWithoutSelectorStart = (node: Node) => withoutSelectorStartMatch.test(node.type);
const isWithoutSelectorEnd = (node: Node) => withoutSelectorEndMatch.test(node.type);

// adjust nodes by selector ends (so that .class:--h1 becomes h1.class rather than .classh1)
const adjustNodesBySelectorEnds = (nodes: Node[], index: number) => {
    if (
        index &&
        nodes[index] &&
        isWithoutSelectorStart(nodes[index]) &&
        isWithoutSelectorEnd(nodes[index - 1])
    ) {
        let safeIndex = index - 1;

        while (safeIndex && isWithoutSelectorEnd(nodes[safeIndex])) {
            --safeIndex;
        }

        if (safeIndex < index) {
            const node = nodes.splice(index, 1)[0];

            nodes.splice(safeIndex, 0, node);

            nodes[safeIndex].spaces.before = nodes[safeIndex + 1].spaces.before;
            nodes[safeIndex + 1].spaces.before = '';

            if (nodes[index]) {
                nodes[index].spaces.after = nodes[safeIndex].spaces.after;
                nodes[safeIndex].spaces.after = '';
            }
        }
    }
};
