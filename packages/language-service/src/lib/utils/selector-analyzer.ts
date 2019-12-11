const selectorTokenizer = require('css-selector-tokenizer');

export interface SelectorQuery {
    _type: string;
    text: string[];
}

export interface SelectorChunk extends SelectorQuery {
    type: string;
    classes: string[];
    customSelectors: string[];
    states: string[];
}

export interface SelectorInternalChunk extends SelectorChunk {
    name: string;
}

export interface CursorPosition {
    focusChunk: SelectorQuery | Array<SelectorChunk | SelectorInternalChunk>;
    index: number;
    internalIndex: number;
}

export function createSelectorChunk(value?: Partial<SelectorChunk>): SelectorChunk {
    return {
        type: '*',
        classes: [],
        customSelectors: [],
        states: [],
        text: [],
        ...value,
        _type: 'chunk'
    };
}

export function createSelectorInternalChunk(
    value?: Partial<SelectorInternalChunk>
): SelectorInternalChunk {
    return { name: '', ...createSelectorChunk(value), _type: 'internal-chunk' };
}

export function createSelectorDirectChild(): SelectorQuery {
    return { _type: 'direct-child', text: [] };
}

export function isSelectorChunk(chunk: SelectorQuery): chunk is SelectorInternalChunk {
    return chunk && chunk._type === 'chunk';
}

export function isSelectorInternalChunk(chunk: SelectorQuery): chunk is SelectorInternalChunk {
    return chunk && chunk._type === 'internal-chunk';
}

export function parseSelector(
    inputSelector: string,
    cursorIndex: number = 0
): { selector: SelectorQuery[]; target: CursorPosition; lastSelector: string } {
    const res: SelectorQuery[] = [];
    const textArr: string[] = [];
    let cursorTarget = { focusChunk: {} as any, text: textArr, index: -1, internalIndex: 0 };
    const tokenizedSelectors = selectorTokenizer.parse(inputSelector);

    if (tokenizedSelectors.type !== 'selectors') {
        throw new Error('not handled');
    }

    const firstSelector = tokenizedSelectors.nodes[0];
    const spaceBeforeSelector = inputSelector.match(/^(\s)*/);
    let selector = inputSelector.trim();
    let currentPosition = (spaceBeforeSelector && spaceBeforeSelector[0].length) || 0;
    let currentSourceQuery: string = '';
    let lastSelector: string = '';
    let chunkInternalPos = 0;
    res.push(createSelectorChunk());
    for (const selectorQueryItem of firstSelector.nodes) {
        let currentTarget = res[res.length - 1];
        if (isSelectorChunk(currentTarget) || isSelectorInternalChunk(currentTarget)) {
            switch (selectorQueryItem.type) {
                case 'class':
                    chunkInternalPos++;
                    currentSourceQuery = '.' + selectorQueryItem.name;
                    currentTarget.text.push(currentSourceQuery);
                    currentTarget.classes.push(selectorQueryItem.name);
                    selector = selector.slice(currentSourceQuery.length);
                    lastSelector = '';
                    break;
                // case 'spacing':
                //     const startSpaceMatch = selector.match(/^(\s)*/);
                //     currentSourceQuery = startSpaceMatch && startSpaceMatch[0] || ' ';
                //     currentTarget = createSelectorDescendent();
                //     currentTarget.text.push(currentSourceQuery);
                //     res.push(currentTarget, createSelectorChunk());
                //     chunkInternalPos = 0;
                //     selector = selector.slice(currentSourceQuery.length);
                //     break;
                case 'operator':
                    if (selectorQueryItem.operator === '>') {
                        const startDirectChildMatch = selector.match(/^(\s*>\s*)?/);
                        currentSourceQuery =
                            (startDirectChildMatch && startDirectChildMatch[0]) ||
                            'no direct child found! - should not happen';
                        currentTarget = createSelectorDirectChild();
                        currentTarget.text.push(currentSourceQuery);
                        res.push(currentTarget, createSelectorChunk());
                        chunkInternalPos = 0;
                        selector = selector.slice(currentSourceQuery.length);
                        lastSelector = '';
                    }
                    break;
                case 'pseudo-class':
                    if (selectorQueryItem.name.startsWith('--')) {
                        chunkInternalPos++; // ?
                        currentSourceQuery = ':' + selectorQueryItem.name;
                        currentTarget.text.push(currentSourceQuery);
                        currentTarget.customSelectors.push(':' + selectorQueryItem.name);
                        selector = selector.slice(currentSourceQuery.length);
                        lastSelector = '';
                        break;
                    } else {
                        chunkInternalPos++;
                        currentSourceQuery = ':' + selectorQueryItem.name;
                        currentTarget.text.push(currentSourceQuery);
                        currentTarget.states.push(selectorQueryItem.name);
                        selector = selector.slice(currentSourceQuery.length);
                        lastSelector = currentSourceQuery;
                        break;
                    }
                case 'pseudo-element':
                    currentSourceQuery = '::' + selectorQueryItem.name;
                    currentTarget = createSelectorInternalChunk({
                        name: selectorQueryItem.name,
                        type: selectorQueryItem.name
                    });
                    currentTarget.text.push(currentSourceQuery);
                    res.push(currentTarget);
                    chunkInternalPos = 0;
                    selector = selector.slice(currentSourceQuery.length);
                    lastSelector = '';
                    break;
                case 'element':
                    chunkInternalPos++;
                    currentSourceQuery = selectorQueryItem.name;
                    currentTarget.text.push(currentSourceQuery);
                    currentTarget.type = selectorQueryItem.name;
                    selector = selector.slice(currentSourceQuery.length);
                    lastSelector = '';
                    break;
                case 'invalid':
                    chunkInternalPos++; // ?
                    currentSourceQuery = selectorQueryItem.value;
                    currentTarget.text.push(currentSourceQuery);
                    selector = selector.slice(currentSourceQuery.length).trim();
                    lastSelector = currentSourceQuery;
                    break;
            }
        } else {
            throw new Error(`found operator where it shouldn't be - should not happen`);
        }
        const queryLength = currentSourceQuery.length;
        const newPosition = currentPosition + queryLength;
        const isCursorInQuery = cursorIndex > currentPosition && cursorIndex <= newPosition;

        if (isCursorInQuery) {
            cursorTarget = {
                focusChunk: currentTarget,
                text: currentTarget.text,
                index: res.indexOf(currentTarget),
                internalIndex: chunkInternalPos
            };
        }
        currentPosition += queryLength;
    }

    // modify internal chunk to list from scope origin to target
    if (isSelectorInternalChunk(cursorTarget.focusChunk)) {
        let currentChunk: SelectorChunk = cursorTarget.focusChunk;
        let index = cursorTarget.index;
        const focusList: Array<SelectorChunk | SelectorInternalChunk> = [];
        while (isSelectorInternalChunk(currentChunk)) {
            focusList.unshift(currentChunk);
            currentChunk = res[--index] as SelectorChunk;
        }
        focusList.unshift(currentChunk);
        cursorTarget.focusChunk = focusList;
    }

    return {
        selector: res,
        target: cursorTarget,
        lastSelector
    };
}
