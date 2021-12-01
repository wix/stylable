import {
    parseCssSelector,
    stringifySelectorAst,
    SelectorList,
    SelectorNode,
    Selector,
    Combinator,
    PseudoElement,
} from '@tokey/css-selector-parser';

export const DOMLocationBasedPseudoClasses = new Set([
    'root',
    'first-child',
    'first-of-type',
    'last-child',
    'last-of-type',
    'nth-child',
    'nth-last-child',
    'nth-last-of-type',
    'nth-of-type',
    'only-child',
    'only-of-type',
]);

/** 
This function splits a selector to all chunks that requires states 
in order to select the DOM structure and apply force states to each node

E.g:

.x:hover .y:focus

will output two selectors

.x and .x .y and for each selector the relevant force states names

for .x -> hover
for .y -> focus

usage in DOM tree: 

// loop over all selectors
createForceStateMatchers('.x:hover .y:focus').forEach((selectorChunksWithStates)=>{
    // loop over all chunks
    selectorChunksWithStates.forEach(({selector, states})=>{
        // find matching DOM nodes
        document.querySelectorAll(selector).forEach((node)=>{
            // apply all force states
            states.forEach(({name})=>{
                node.setAttribute('data-force-state-' + name);
            });
        });
    });

});

*/
export type SelectorWithStatesMatcher = { states: State[]; selector: string };

export function createForceStateMatchers(selector: string): SelectorWithStatesMatcher[][] {
    const ast = parseCssSelector(selector);

    const chunks = separateStateChunks(ast);
    const forces: SelectorWithStatesMatcher[][] = [];

    for (let i = 0; i < chunks.length; i++) {
        const selectorChunks = chunks[i];
        const selectorForces: SelectorWithStatesMatcher[] = [];
        forces.push(selectorForces);
        for (let j = 0; j < selectorChunks.length; j++) {
            const relevantChunks = selectorChunks.slice(0, j + 1);
            const lastTarget = relevantChunks[relevantChunks.length - 1];
            selectorForces.push({
                states: lastTarget.states,
                selector: stringifySelectorAst(mergeStateChunks([relevantChunks])),
            });
        }
    }
    return forces;
}

interface State {
    type: 'pseudo-class';
    name: string;
}
export interface SelectorChunkWithStates {
    cause: Combinator | PseudoElement | null;
    before: string;
    nodes: SelectorNode[];
    states: State[];
}

function mergeStateChunks(chunks: SelectorChunkWithStates[][]) {
    const ast: SelectorList = [];
    let i = 0;

    for (const selectorChunks of chunks) {
        ast[i] = {
            type: 'selector',
            nodes: [],
            start: 0,
            end: 0,
            before: selectorChunks.length ? selectorChunks[0].before : ``,
            after: ``,
        } as Selector;
        for (const chunk of selectorChunks) {
            if (chunk.cause) {
                ast[i].nodes.push(chunk.cause);
            }
            for (const node of chunk.nodes) {
                ast[i].nodes.push(node);
            }
        }
        i++;
    }
    return ast;
}
function separateStateChunks(selectorList: SelectorList) {
    const selectors: SelectorChunkWithStates[][] = [];
    selectorList.map(({ nodes, before }) => {
        selectors.push([{ cause: null, before, nodes: [], states: [] }]);
        nodes.forEach((node) => {
            if (node.type === 'combinator') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ cause: node, before: ``, nodes: [], states: [] });
            } else if (
                node.type === 'pseudo_class' &&
                !DOMLocationBasedPseudoClasses.has(node.value) &&
                node.value !== 'not'
            ) {
                const chunks = selectors[selectors.length - 1];
                const current = chunks[chunks.length - 1];
                current.states.push({
                    type: `pseudo-class`,
                    name: node.value,
                });
            } else if (node.type === 'pseudo_element') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ cause: node, before: ``, nodes: [], states: [] });
            } else {
                const chunks = selectors[selectors.length - 1];
                chunks[chunks.length - 1].nodes.push(node);
            }
        });
    });
    return selectors;
}
