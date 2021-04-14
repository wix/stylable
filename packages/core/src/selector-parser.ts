enum TokenTypes {
    id = 'id',
    class = 'class',
    element = 'element',
    space = 'space',
    pseudoClass = 'pseudo-class',
    pseudoElement = 'pseudo-element',
    nestedPseudoClass = 'nested-pseudo-class',
    nestedPseudoElement = 'nested-pseudo-element',
    comma = 'comma',
    string = 'string',
    attr = 'attr',
    star = 'star',
    combinator = 'combinator',
}

type Pos = [number, number];
const VALID_CHARS = /[-\w\u{0080}-\u{FFFF}]/u;
const DIGIT = /\d/;

function isWhiteSpace(char: string) {
    return char.trim() === '';
}

function last(tokens: AToken[]): undefined | AToken {
    return tokens[tokens.length - 1];
}
interface Token {
    pos: Pos;
    value: string;
}

const ID = (value: string, pos: Pos) => ({
    type: TokenTypes.id as const,
    value,
    pos,
});

const SPACE = (value: string, pos: Pos) => ({
    type: TokenTypes.space as const,
    value,
    pos,
});

const COMMA = (value: string, pos: Pos) => ({
    type: TokenTypes.comma as const,
    value,
    pos,
});

const STAR = (value: string, pos: Pos) => ({
    type: TokenTypes.star as const,
    value,
    pos,
});

const COMBINATOR = (value: string, pos: Pos) => ({
    type: TokenTypes.combinator as const,
    value,
    pos,
});

const CLASS = (value: string, pos: Pos) => ({
    type: TokenTypes.class as const,
    value,
    pos,
});

const ELEMENT = (value: string, pos: Pos, namespace?: string) => ({
    type: TokenTypes.element as const,
    value,
    pos,
    namespace,
});

const PSEUDO_CLASS = (value: string, pos: Pos) => ({
    type: TokenTypes.pseudoClass as const,
    value,
    pos,
});

const PSEUDO_ELEMENT = (value: string, pos: Pos) => ({
    type: TokenTypes.pseudoElement as const,
    value,
    pos,
});

const STRING = (value: string, pos: Pos) => ({
    type: TokenTypes.string as const,
    value,
    pos,
});

const ATTR = (value: string, name: string, operator: string, attrValue: string, pos: Pos) => ({
    type: TokenTypes.string as const,
    value,
    pos,
    name,
    operator,
    attrValue,
});

interface NESTED_PSEUDO_CLASS extends Token {
    type: TokenTypes.nestedPseudoClass;
    name: string;
    subtree: AToken[];
}

const NESTED_PSEUDO_CLASS = (
    value: string,
    name: string,
    subtree: AToken[],
    pos: Pos
): NESTED_PSEUDO_CLASS => ({
    type: TokenTypes.nestedPseudoClass as const,
    value,
    pos,
    name,
    subtree,
});

interface NESTED_PSEUDO_ELEMENT extends Token {
    type: TokenTypes.nestedPseudoElement;
    name: string;
    subtree: AToken[];
}

const NESTED_PSEUDO_ELEMENT = (
    value: string,
    name: string,
    subtree: AToken[],
    pos: Pos
): NESTED_PSEUDO_ELEMENT => ({
    type: TokenTypes.nestedPseudoElement as const,
    value,
    pos,
    name,
    subtree,
});

type NonNestedATokenFactory =
    | typeof ID
    | typeof SPACE
    | typeof CLASS
    | typeof ELEMENT
    | typeof PSEUDO_CLASS
    | typeof PSEUDO_ELEMENT
    | typeof COMMA
    | typeof ATTR
    | typeof STAR
    | typeof COMBINATOR
    | typeof STRING;

type AToken = ReturnType<NonNestedATokenFactory> | NESTED_PSEUDO_CLASS | NESTED_PSEUDO_ELEMENT;

function tokenize(selector: string): AToken[] {
    let tokens: AToken[] = [];
    let pos = 0;
    const chars = selector[Symbol.iterator]();
    for (const char of chars) {
        iteration(char);
    }
    function iteration(char: string, isNested = false): string | void {
        if (pos >= selector.length) {
            return;
        }
        if (char === '(') {
            throw new Error('Invalid selector');
        } else if (char === ')') {
            return char;
        } else if (char === '[') {
            let inStringKind = '';
            let name = '';
            let spaceBefore = '';
            let spaceAfter = '';
            let spaceBeforeValue = '';
            let spaceAfterValue = '';
            let operator = '';
            let value = '';
            let prev = '';
            let close = '';
            let invalid = '';
            const start = pos;
            for (char of chars) {
                if (!inStringKind) {
                    if (char === `"` || char === `'`) {
                        if (!name) {
                            throw new Error('Invalid selector');
                        }
                        value = inStringKind = char;
                    } else if (char === ']') {
                        close = char;
                        break;
                    } else if (VALID_CHARS.test(char)) {
                        name += char;
                    } else if (!name && isWhiteSpace(char)) {
                        spaceBefore += char;
                    } else if (name && !operator && isWhiteSpace(char)) {
                        spaceAfter += char;
                    } else if ((name && !operator) || char === '=') {
                        operator += char;
                    } else if (operator && name && !value && isWhiteSpace(char)) {
                        spaceBeforeValue += char;
                    } else if (value && isWhiteSpace(char)) {
                        spaceAfterValue += char;
                    } else {
                        invalid = char;
                        break;
                    }
                } else if (char === inStringKind && prev !== '\\') {
                    value += char;
                    inStringKind = '';
                } else if (inStringKind) {
                    value += char;
                } else {
                    invalid = char;
                    break;
                }
                prev = char;
            }
            const val = `[${spaceBefore}${name}${spaceAfter}${operator}${spaceBeforeValue}${value}${spaceAfterValue}${close}${invalid}`;
            const end = (pos += val.length);
            tokens.push(ATTR(val, name, operator, value, [start, end]));
        } else if (char === `"` || char === `'`) {
            const stringKind = char;
            const start = pos;
            let val = char;
            let prev = '';
            for (char of chars) {
                val += char;
                if (char === stringKind && prev !== '\\') {
                    break;
                }
                prev = char;
            }
            const end = (pos += val.length);
            tokens.push(STRING(val, [start, end]));
        } else if (char === ',') {
            tokens.push(COMMA(',', [pos, (pos += 1)]));
        } else if (char === '>') {
            tokens.push(COMBINATOR('>', [pos, (pos += 1)]));
        } else if (char === '*') {
            tokens.push(STAR('*', [pos, (pos += 1)]));
        } else if (char === '+') {
            tokens.push(COMBINATOR('+', [pos, (pos += 1)]));
        } else if (char === '|') {
            const lastToken = last(tokens);

            if (lastToken?.type === TokenTypes.star || lastToken?.type === TokenTypes.element) {
                tokens.pop();
            }

            let name = '';
            const start = lastToken?.pos[0] ?? pos;
            for (char of chars) {
                if (VALID_CHARS.test(char)) {
                    name += char;
                } else {
                    break;
                }
            }
            const end = (pos += name.length + 1);
            tokens.push(ELEMENT(name, [start, end], lastToken?.value ?? ''));
            return iteration(char);
        } else if (char === ':') {
            let isPseudoElement = false;
            let subTree: AToken[] = [];
            let name = '';
            const start = pos;
            for (char of chars) {
                if (char === ':' && !isPseudoElement && name === '') {
                    isPseudoElement = true;
                } else if (VALID_CHARS.test(char)) {
                    name += char;
                } else if (char === '(') {
                    pos += name.length + (isPseudoElement ? 2 : 1) + 1;
                    isNested = true;
                    const tmp = tokens;
                    tokens = [];
                    for (char of chars) {
                        const res = iteration(char, isNested);
                        if (res === ')') {
                            break;
                        }
                    }
                    subTree = tokens;
                    tokens = tmp;
                } else {
                    break;
                }
            }
            if (isNested) {
                isNested = false;
                const s = subTree[0]?.pos[0] ?? 0;
                const e = last(subTree)?.pos[1] ?? 0;
                const val = `${name}(${selector.slice(s, e)})`;
                const end = (pos = start + val.length + (isPseudoElement ? 2 : 1));
                tokens.push(
                    (isPseudoElement ? NESTED_PSEUDO_ELEMENT : NESTED_PSEUDO_CLASS)(
                        val,
                        name,
                        subTree,
                        [start, end]
                    )
                );
            } else {
                tokens.push(
                    (isPseudoElement ? PSEUDO_ELEMENT : PSEUDO_CLASS)(name, [
                        pos,
                        (pos += name.length + (isPseudoElement ? 2 : 1)),
                    ])
                );
            }
            return iteration(char);
        } else if (char === '.') {
            let val = '';
            const start = pos;
            for (char of chars) {
                if (VALID_CHARS.test(char)) {
                    val += char;
                } else {
                    break;
                }
            }
            const end = (pos += val.length + 1);
            tokens.push(CLASS(val, [start, end]));
            return iteration(char);
        } else if (char === '#') {
            let val = '';
            const start = pos;
            for (char of chars) {
                if (VALID_CHARS.test(char)) {
                    val += char;
                } else {
                    break;
                }
            }
            const end = (pos += val.length + 1);
            tokens.push(ID(val, [start, end]));
            return iteration(char);
        } else if (isWhiteSpace(char)) {
            let val = char;
            const start = pos;
            for (char of chars) {
                if (isWhiteSpace(char)) {
                    val += char;
                } else {
                    break;
                }
            }
            const end = (pos += val.length);
            tokens.push(SPACE(val, [start, end]));
            return iteration(char);
        } else if (DIGIT.test(char)) {
            // let;

            throw new Error('TODO');
        } else if (VALID_CHARS.test(char)) {
            // TODO support namespace and number
            let val = char;
            const start = pos;
            for (char of chars) {
                if (VALID_CHARS.test(char)) {
                    val += char;
                } else {
                    break;
                }
            }
            const end = (pos += val.length);
            tokens.push(ELEMENT(val, [start, end]));
            return iteration(char);
        }
    }
    return tokens;
}

// testTokens(`#foo > .bar + div.k1.k2 [id='baz']:hello(2):not(:where(#yolo))::before`, []);

// testTokens(':nth-child(2n+1)', []);

// BROKEN INPUT
function RunBroken() {
    testTokens(`["attr"="value"]`, [], 'Invalid selector');

    testTokens('::::hover', [PSEUDO_ELEMENT('', [0, 2]), PSEUDO_ELEMENT('hover', [2, 9])]);

    testTokens(':::::hover', [
        PSEUDO_ELEMENT('', [0, 2]),
        PSEUDO_ELEMENT('', [2, 4]),
        PSEUDO_CLASS('hover', [4, 10]),
    ]);

    testTokens(',', [COMMA(',', [0, 1])]);

    testTokens(`""`, [STRING('""', [0, 2])]);
    testTokens('"str"', [STRING('"str"', [0, 5])]);
    testTokens('"st\\"r"', [STRING('"st\\"r"', [0, 7])]);

    testTokens('*|', [ELEMENT('', [0, 2], '*')]);
    testTokens('*|.y', [ELEMENT('', [0, 2], '*'), CLASS('y', [2, 4])]);
    testTokens('|div', [ELEMENT('div', [0, 4], '')]);
}

RunBroken();

// NORMAL STUFF

testTokens(':not(:where(#x))', [
    NESTED_PSEUDO_CLASS(
        'not(:where(#x))',
        'not',
        [NESTED_PSEUDO_CLASS('where(#x)', 'where', [ID('x', [12, 14])], [5, 15])],
        [0, 16]
    ),
]);

testTokens(':nth-child(2n)', [NESTED_PSEUDO_CLASS(':nth-child(2n)', 'nth-child', [], [0, 14])]);

// testTokens("[$#name]", []);

testTokens('[ na_me ^= "xxx" ]', [ATTR('[ na_me ^= "xxx" ]', 'na_me', '^=', '"xxx"', [0, 18])]);

testTokens('*|div', [ELEMENT('div', [0, 5], '*')]);

testTokens('name|div', [ELEMENT('div', [0, 8], 'name')]);

testTokens(':not()', [NESTED_PSEUDO_CLASS('not()', 'not', [], [0, 6])]);

testTokens(':not(.x)', [NESTED_PSEUDO_CLASS('not(.x)', 'not', [CLASS('x', [5, 7])], [0, 8])]);

testTokens('div', [ELEMENT('div', [0, 3])]);

testTokens('div p', [ELEMENT('div', [0, 3]), SPACE(' ', [3, 4]), ELEMENT('p', [4, 5])]);

testTokens('#asd', [ID('asd', [0, 4])]);

testTokens('.a,.b', [CLASS('a', [0, 2]), COMMA(',', [2, 3]), CLASS('b', [3, 5])]);

testTokens('#asd #xyz', [ID('asd', [0, 4]), SPACE(' ', [4, 5]), ID('xyz', [5, 9])]);

testTokens('.class', [CLASS('class', [0, 6])]);

testTokens('.class:hover', [CLASS('class', [0, 6]), PSEUDO_CLASS('hover', [6, 12])]);

testTokens('.class:hover:focus', [
    CLASS('class', [0, 6]),
    PSEUDO_CLASS('hover', [6, 12]),
    PSEUDO_CLASS('focus', [12, 18]),
]);

testTokens('.class::before', [CLASS('class', [0, 6]), PSEUDO_ELEMENT('before', [6, 14])]);

testTokens('.class::before::after', [
    CLASS('class', [0, 6]),
    PSEUDO_ELEMENT('before', [6, 14]),
    PSEUDO_ELEMENT('after', [14, 21]),
]);

testTokens('.class:hover::after:focus', [
    CLASS('class', [0, 6]),
    PSEUDO_CLASS('hover', [6, 12]),
    PSEUDO_ELEMENT('after', [12, 19]),
    PSEUDO_CLASS('focus', [19, 25]),
]);

function testTokens(input: string, output: AToken[], throws = '') {
    let res;
    try {
        res = tokenize(input);
    } catch (e) {
        if (throws === e.message) {
            console.log('THROW_PASS: ' + input);
            return;
        } else {
            throw e;
        }
    }
    if (JSON.stringify(res) !== JSON.stringify(output)) {
        throw new Error('Fail ' + JSON.stringify({ input, res, output }, null, 4));
    } else {
        console.log('PASS: ' + input);
    }
}
