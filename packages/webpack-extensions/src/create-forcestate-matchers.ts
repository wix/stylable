import { parseSelector, SelectorAstNode, stringifySelector, SelectorChunk2 } from '@stylable/core';

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
export type SelectorWithStatesMatcher = { states: SelectorAstNode[]; selector: string };

export function createForceStateMatchers(selector: string): SelectorWithStatesMatcher[][] {
    const ast = parseSelector(selector);

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
                selector: stringifySelector(mergeStateChunks([relevantChunks])),
            });
        }
    }
    return forces;
}

interface SelectorChunkWithStates extends SelectorChunk2 {
    states: SelectorAstNode[];
}

function mergeStateChunks(chunks: SelectorChunk2[][]) {
    const ast: any = { type: 'selectors', nodes: [] };
    let i = 0;

    for (const selectorChunks of chunks) {
        ast.nodes[i] = { type: 'selector', nodes: [] };
        for (const chunk of selectorChunks) {
            if (chunk.type !== 'selector') {
                ast.nodes[i].nodes.push(chunk);
            } else {
                ast.nodes[i].before = chunk.before;
            }
            for (const node of chunk.nodes) {
                ast.nodes[i].nodes.push(node);
            }
        }
        i++;
    }
    return ast;
}
export function separateStateChunks(selectorNode: SelectorAstNode) {
    const selectors: SelectorChunkWithStates[][] = [];
    selectorNode.nodes.map(({ nodes, before }) => {
        selectors.push([{ type: 'selector', nodes: [], before, states: [] }]);
        nodes.forEach((node) => {
            if (node.type === 'operator') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ ...node, nodes: [], states: [] });
            } else if (node.type === 'spacing') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ ...node, nodes: [], states: [] });
            } else if (
                !DOMLocationBasedPseudoClasses.has(node.name) &&
                (node.type === 'pseudo-class' ||
                    (node.type === 'nested-pseudo-class' && node.name !== 'not'))
            ) {
                const chunks = selectors[selectors.length - 1];
                const current = chunks[chunks.length - 1];
                current.states.push(node);
            } else if (node.type === 'pseudo-element') {
                const chunks = selectors[selectors.length - 1];
                chunks.push({ ...node, nodes: [], states: [] });
            } else {
                const chunks = selectors[selectors.length - 1];
                chunks[chunks.length - 1].nodes.push(node);
            }
        });
    });
    return selectors;
}
