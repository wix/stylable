import {
    Descriptors,
    Seeker,
    Token,
    createToken,
    getUnclosedComment,
    getJSCommentStartType,
    isComment,
    isCommentEnd,
    isStringDelimiter,
    isWhitespace,
    tokenize,
} from 'toky';

type Delimiters =
    | ':'
    | ';'
    | '*'
    | '/'
    | '.'
    | ','
    | '('
    | ')'
    | '{'
    | '}'
    | '>'
    | '='
    | '<'
    | '|'
    | '?'
    | '['
    | ']'
    | '+'
    | '-'
    | '~'
    | '^'
    | '&'
    | '%'
    | '!'
    | '\n';

export type DTSCodeToken = Token<Descriptors | Delimiters>;

export function tokenizeDTS(source: string) {
    return findDtsTokens(
        tokenize<DTSCodeToken>(source, {
            isDelimiter,
            isStringDelimiter,
            isWhitespace,
            shouldAddToken,
            createToken,
            getCommentStartType: getJSCommentStartType,
            isCommentEnd,
            getUnclosedComment,
        })
    );
}

const isDelimiter = (char: string) =>
    char === ':' ||
    char === ';' ||
    char === '*' ||
    char === '/' ||
    char === '.' ||
    char === ',' ||
    char === '(' ||
    char === ')' ||
    char === '{' ||
    char === '}' ||
    char === '>' ||
    char === '=' ||
    char === '<' ||
    char === '|' ||
    char === '?' ||
    char === '[' ||
    char === ']' ||
    char === '+' ||
    char === '-' ||
    char === '~' ||
    char === '^' ||
    char === '&' ||
    char === '%' ||
    char === '!' ||
    char === '\n';

export type TokenizedDtsEntry = ClassesToken | VarsToken | StVarsToken | KeyframesToken;
export type RelevantKeys = 'classes' | 'vars' | 'stVars' | 'keyframes';

export interface DtsToken extends DTSCodeToken {
    line: number;
}

export type ClassesToken = { type: 'classes'; tokens: DtsToken[]; start: number; end: number };
export type VarsToken = { type: 'vars'; tokens: DtsToken[]; start: number; end: number };
export type StVarsToken = { type: 'stVars'; tokens: DtsToken[]; start: number; end: number };
export type KeyframesToken = { type: 'keyframes'; tokens: DtsToken[]; start: number; end: number };

const shouldAddToken = (type: DTSCodeToken['type']) =>
    isComment(type) || type === 'space' ? false : true;

function isRelevantKey(name: string): name is RelevantKeys {
    return name === 'classes' || name === 'vars' || name === 'stVars' || name === 'keyframes';
}

export function findDtsTokens(tokens: DTSCodeToken[]) {
    const s = new Seeker(tokens);
    let t;
    const dtsTokens: TokenizedDtsEntry[] = [];
    let lineCount = 0;

    while ((t = s.next())) {
        if (!t.type) {
            break;
        }

        if (t.type === '\n') {
            lineCount += 1;
        } else if (
            t.value === 'declare' &&
            s.peek().value === 'const' &&
            isRelevantKey(s.peek(2).value)
        ) {
            const start = t.start;
            s.next();
            const declareType = s.next();
            s.next();

            const resTokens: DtsToken[] = [];
            while ((t = s.next())) {
                if (!t.type || t.type === '}') {
                    break;
                }

                if (t.type === '\n') {
                    lineCount += 1;
                } else if (t.type === 'string') {
                    resTokens.push({ ...t, line: lineCount });

                    s.next();
                    s.next();
                    s.next();
                }
            }

            const end = t.end;
            dtsTokens.push({
                type: declareType.value as RelevantKeys,
                tokens: resTokens,
                start,
                end,
            });
        }
    }

    return dtsTokens;
}
