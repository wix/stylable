import path from 'path';
import ts from 'typescript';
import postcss from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import { IFileSystem, IFileSystemDescriptor } from '@file-services/types';
import {
    ClassSymbol,
    CSSResolve,
    Diagnostics,
    ElementSymbol,
    expandCustomSelectors,
    ImportSymbol,
    process as stylableProcess,
    safeParse,
    SRule,
    StateParsedValue,
    Stylable,
    StylableMeta,
    StylableTransformer,
    valueMapping,
} from '@stylable/core';
import {
    Location,
    ParameterInformation,
    Position,
    SignatureHelp,
    SignatureInformation,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import {
    CodeMixinCompletionProvider,
    CompletionProvider,
    createRange,
    CssMixinCompletionProvider,
    ExtendCompletionProvider,
    FormatterCompletionProvider,
    GlobalCompletionProvider,
    ImportInternalDirectivesProvider,
    NamedCompletionProvider,
    ProviderOptions,
    ProviderPosition,
    ProviderRange,
    PseudoElementCompletionProvider,
    RulesetInternalDirectivesProvider,
    SelectorCompletionProvider,
    StateEnumCompletionProvider,
    StateSelectorCompletionProvider,
    StateTypeCompletionProvider,
    TopLevelDirectiveProvider,
    ValueCompletionProvider,
    ValueDirectiveProvider,
} from './completion-providers';
import { Completion } from './completion-types';
import {
    createStateTypeSignature,
    createStateValidatorSignature,
    resolveStateParams,
    resolveStateTypeOrValidator,
} from './feature/pseudo-class';
import { ExtendedTsLanguageService } from './types';
import { isInNode, isRoot, isSelector, pathFromPosition } from './utils/postcss-ast-utils';
import {
    parseSelector,
    SelectorChunk,
    SelectorInternalChunk,
    SelectorQuery,
} from './utils/selector-analyzer';

const selectorTokenizer = require('css-selector-tokenizer');

function findLast<T>(
    arr: T[],
    predicate: (item: T, index: number, array: T[]) => boolean
): T | null {
    for (let index = arr.length - 1; index >= 0; index--) {
        const item = arr[index];

        if (predicate(item, index, arr)) {
            return item;
        }
    }

    return null;
}

export class Provider {
    private providers: CompletionProvider[] = [
        RulesetInternalDirectivesProvider,
        ImportInternalDirectivesProvider,
        TopLevelDirectiveProvider,
        ValueDirectiveProvider,
        GlobalCompletionProvider,
        SelectorCompletionProvider,
        ExtendCompletionProvider,
        CssMixinCompletionProvider,
        CodeMixinCompletionProvider,
        FormatterCompletionProvider,
        NamedCompletionProvider,
        StateTypeCompletionProvider,
        StateSelectorCompletionProvider,
        StateEnumCompletionProvider,
        PseudoElementCompletionProvider,
        ValueCompletionProvider,
    ];
    constructor(private stylable: Stylable, private tsLangService: ExtendedTsLanguageService) {}

    public provideCompletionItemsFromSrc(
        src: string,
        pos: Position,
        fileName: string,
        fs: IFileSystem
    ): Completion[] {
        const res = fixAndProcess(src, pos, fileName);
        const completions: Completion[] = [];
        try {
            const options = this.createProviderOptions(
                src,
                pos,
                res.processed.meta!,
                res.processed.fakes,
                res.currentLine,
                res.cursorLineIndex,
                fs
            );
            this.providers.forEach((p) => {
                completions.push(...p.provide(options));
            });
        } catch {
            /**/
        }
        return this.dedupeComps(completions);
    }

    public getDefinitionLocation(
        src: string,
        position: ProviderPosition,
        filePath: string,
        fs: IFileSystem
    ): ProviderLocation[] {
        if (!filePath.endsWith('.st.css')) {
            return [];
        }

        const callingMeta = this.stylable.process(filePath);
        const { word, meta } = getDefSymbol(src, position, filePath, this.stylable);
        if (!meta || !word) {
            return [];
        }

        const defs: ProviderLocation[] = [];
        let temp: ClassSymbol | null = null;
        let stateMeta: StylableMeta;

        if (Object.keys(meta.mappedSymbols).find((sym) => sym === word.replace('.', ''))) {
            const symb = meta.mappedSymbols[word.replace('.', '')];
            switch (symb._kind) {
                case 'class': {
                    defs.push(
                        new ProviderLocation(
                            meta.source,
                            this.findWord(
                                word.replace('.', ''),
                                fs.readFileSync(meta.source, 'utf8'),
                                position
                            )
                        )
                    );
                    break;
                }
                case 'var': {
                    defs.push(
                        new ProviderLocation(
                            meta.source,
                            this.findWord(word, fs.readFileSync(meta.source, 'utf8'), position)
                        )
                    );
                    break;
                }
                case 'import': {
                    let rslvd = null;
                    try {
                        rslvd = this.stylable.resolver.resolve(symb);
                    } catch {
                        /**/
                    }

                    let filePath: string;

                    if (rslvd && rslvd._kind !== 'js') {
                        filePath = (rslvd as CSSResolve).meta.source;
                    } else {
                        filePath = this.stylable.resolvePath(undefined, symb.import.from);
                    }
                    const doc = fs.readFileSync(filePath, 'utf8');

                    if (doc !== '') {
                        defs.push(
                            new ProviderLocation(filePath, this.findWord(word, doc, position))
                        );
                    }
                    break;
                }
            }
        } else if (
            Object.values(meta.mappedSymbols).some((k) => {
                if (k._kind === 'class') {
                    const symbolStates = k[valueMapping.states];

                    if (symbolStates && Object.keys(symbolStates).some((key) => key === word)) {
                        const postcsspos = new ProviderPosition(
                            position.line + 1,
                            position.character
                        );
                        const pfp = pathFromPosition(callingMeta.rawAst, postcsspos, [], true);
                        const selec = (pfp[pfp.length - 1] as postcss.Rule).selector;

                        // If called from -st-state, i.e. inside node, pos is not in selector.
                        // Use 1 and not 0 for selector that starts with'.'
                        const char = isInNode(postcsspos, pfp[pfp.length - 1])
                            ? 1
                            : position.character;
                        const parsel = parseSelector(selec, char);
                        const t = parsel.target;
                        const arr = Array.isArray(t.focusChunk)
                            ? (t.focusChunk as SelectorQuery[])[t.index].text
                            : t.focusChunk.text;
                        let name = findLast(
                            arr,
                            (str: string) => !str.startsWith(':') || str.startsWith('::')
                        );
                        name = name!.replace('.', '').replace(/:/g, '');
                        if (
                            name === k.name ||
                            (!name.startsWith(name.charAt(0).toLowerCase()) && k.name === 'root')
                        ) {
                            temp = k;
                            stateMeta = meta;
                            return true;
                        } else if (
                            !!callingMeta.mappedSymbols[name] &&
                            !!(callingMeta.mappedSymbols[name] as ClassSymbol)[valueMapping.extends]
                        ) {
                            const res = this.findMyState(callingMeta, name, word);
                            if (res) {
                                temp = k;
                                stateMeta = res.meta;
                                return true;
                            }
                        }
                    }
                }
                return false;
            })
        ) {
            defs.push(
                new ProviderLocation(
                    meta.source,
                    this.findWord(temp!.name, fs.readFileSync(stateMeta!.source, 'utf8'), position)
                )
            );
        } else if (Object.keys(meta.customSelectors).find((sym) => sym === ':--' + word)) {
            defs.push(
                new ProviderLocation(meta.source, this.findWord(':--' + word, src, position))
            );
        } else if (!word.startsWith(word.charAt(0).toLowerCase())) {
            // Default import, link to top of imported stylesheet
            defs.push(new ProviderLocation(meta.source, createRange(0, 0, 0, 0)));
        }

        return defs;
    }

    public findMyState(
        origMeta: StylableMeta,
        elementName: string,
        state: string
    ): CSSResolve | null {
        const importedSymbol = origMeta.classes[elementName][valueMapping.extends];
        let res;

        if (importedSymbol && importedSymbol._kind === 'import') {
            res = this.stylable.resolver.resolveImport(importedSymbol);
        }

        if (
            !!res &&
            res._kind === 'css' &&
            Object.keys(res.symbol[valueMapping.states]).includes(state)
        ) {
            return res as CSSResolve;
        } else if (
            !!res &&
            res._kind === 'css' &&
            !!(origMeta.mappedSymbols[elementName] as ClassSymbol)[valueMapping.extends]
        ) {
            return this.findMyState(res.meta!, res.symbol.name, state);
        } else {
            return null;
        }
    }

    public getSignatureHelp(
        src: string,
        pos: Position,
        filePath: string,
        fs: IFileSystem,
        paramInfo: typeof ParameterInformation
    ): SignatureHelp | null {
        if (!filePath.endsWith('.st.css')) {
            return null;
        }
        const {
            processed: { meta },
        } = fixAndProcess(src, pos, filePath);
        if (!meta) {
            return null;
        }

        const split = src.split('\n');
        const line = split[pos.line];
        let value = '';

        const path = pathFromPosition(meta.rawAst, {
            line: pos.line + 1,
            character: pos.character + 1,
        });

        if (isRoot(path[path.length - 1])) {
            // TODO: check your actually on a selector
            return this.getSignatureForStateWithParamSelector(meta, pos, line);
        } else if (line.slice(0, pos.character).trim().startsWith(valueMapping.states)) {
            return this.getSignatureForStateWithParamDefinition(pos, line);
        }

        // If last node is not root, we're in a declaration [TODO: or a media query]
        if (line.slice(0, pos.character).trim().startsWith(valueMapping.mixin)) {
            // TODO: handle multiple lines as well
            value = line
                .slice(0, pos.character)
                .trim()
                .slice(valueMapping.mixin.length + 1)
                .trim();
        } else if (line.slice(0, pos.character).trim().includes(':')) {
            value = line
                .slice(0, pos.character)
                .trim()
                .slice(line.slice(0, pos.character).trim().indexOf(':') + 1)
                .trim();
        }
        if (/value\(\s*[^)]*$/.test(value)) {
            return null;
        }
        const parsed = postcssValueParser(value);

        let mixin = '';
        const rev = parsed.nodes[parsed.nodes.length - 1];
        if (rev.type === 'function' && !!rev.unclosed) {
            mixin = rev.value;
        } else {
            return null;
        }
        const activeParam = rev.nodes.reduce((acc, cur) => {
            return cur.type === 'div' ? acc + 1 : acc;
        }, 0);

        if (mixin === 'value') {
            return null;
        }

        const mappedSymbol = meta.mappedSymbols[mixin];

        if (mappedSymbol && mappedSymbol._kind === 'import') {
            if (mappedSymbol.import.from.endsWith('.ts')) {
                return this.getSignatureForTsModifier(
                    mixin,
                    activeParam,
                    mappedSymbol.import.from,
                    (meta.mappedSymbols[mixin]! as ImportSymbol).type === 'default',
                    paramInfo
                );
            } else if (mappedSymbol.import.from.endsWith('.js')) {
                if (fs.fileExistsSync(mappedSymbol.import.from.slice(0, -3) + '.d.ts')) {
                    return this.getSignatureForTsModifier(
                        mixin,
                        activeParam,
                        mappedSymbol.import.from.slice(0, -3) + '.d.ts',
                        mappedSymbol.type === 'default',
                        paramInfo
                    );
                } else {
                    const importPath = mappedSymbol.import.from;
                    const resolvedPath = this.stylable.resolvePath(undefined, importPath);
                    const fileExists = fs.fileExistsSync(resolvedPath);

                    return fileExists
                        ? this.getSignatureForJsModifier(
                              mixin,
                              activeParam,
                              fs.readFileSync(resolvedPath, 'utf8'),
                              paramInfo
                          )
                        : null;
                }
            }
        }

        return null;
    }

    private findWord(word: string, src: string, position: Position): ProviderRange {
        const split = src.split('\n');
        const regex =
            '\\b' + '\\.?' + this.escapeRegExp(word.replace('.', '').replace(':--', '')) + '\\b';
        let lineIndex = split.findIndex((l) => {
            const reg = RegExp(regex).exec(l);
            return !!reg && l.slice(reg.index - 2, reg.index) !== '::';
        });
        if (lineIndex === -1 || lineIndex === position.line) {
            lineIndex = position.line;
            // lineIndex = split.findIndex(l => l.trim().indexOf(word) !== -1)
        }
        if (lineIndex === -1) {
            return createRange(0, 0, 0, 0);
        }
        const line = split[lineIndex];

        const match = line.match(RegExp(regex));

        if (match) {
            return createRange(
                lineIndex,
                line.lastIndexOf(word),
                lineIndex,
                line.lastIndexOf(word) + word.length
            );
        } else {
            return createRange(0, 0, 0, 0);
        }
    }

    private escapeRegExp(re: string) {
        return re.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
    }

    private getSignatureForTsModifier(
        mixin: string,
        activeParam: number,
        filePath: string,
        isDefault: boolean,
        paramInfo: typeof ParameterInformation
    ): SignatureHelp | null {
        const sig: ts.Signature | undefined = extractTsSignature(
            filePath,
            mixin,
            isDefault,
            this.tsLangService
        );
        if (!sig || !sig.declaration) {
            return null;
        }
        const ptypes = sig.parameters.map((p) => {
            return (
                p.name +
                ':' +
                ((p.valueDeclaration as ts.ParameterDeclaration)
                    .type as ts.TypeReferenceNode).getFullText()
            );
        });

        const rtype = sig.declaration.type
            ? (sig.declaration.type as ts.TypeReferenceNode).getText()
            : '';

        const parameters: ParameterInformation[] = sig.parameters.map((pt) => {
            const label =
                pt.name +
                ':' +
                ((pt.valueDeclaration as ts.ParameterDeclaration)
                    .type as ts.TypeReferenceNode).getFullText();
            return paramInfo.create(label);
        });

        const sigInfo: SignatureInformation = {
            label: mixin + '(' + ptypes.join(', ') + '): ' + rtype,
            parameters,
        };

        return {
            activeParameter: activeParam,
            activeSignature: 0,
            signatures: [sigInfo],
        } as SignatureHelp;
    }

    private getSignatureForJsModifier(
        mixin: string,
        activeParam: number,
        fileSrc: string,
        paramInfo: typeof ParameterInformation
    ): SignatureHelp | null {
        const lines = fileSrc.split('\n');
        const mixinLine: number = lines.findIndex((l) => l.trim().startsWith('exports.' + mixin));
        const docStartLine: number = lines.slice(0, mixinLine).lastIndexOf(
            lines
                .slice(0, mixinLine)
                .reverse()
                .find((l) => l.trim().startsWith('/**'))!
        );
        const docLines = lines.slice(docStartLine, mixinLine);
        const formattedLines: string[] = [];

        docLines.forEach((l) => {
            if (l.trim().startsWith('*/')) {
                return;
            }
            if (l.trim().startsWith('/**') && !!l.trim().slice(3).trim()) {
                formattedLines.push(l.trim().slice(3).trim());
            }
            if (l.trim().startsWith('*')) {
                formattedLines.push(l.trim().slice(1).trim());
            }
        });

        const returnStart: number = formattedLines.findIndex((l) => l.startsWith('@returns'));
        const returnEnd: number =
            formattedLines.slice(returnStart + 1).findIndex((l) => l.startsWith('@')) === -1
                ? formattedLines.length - 1
                : formattedLines.slice(returnStart + 1).findIndex((l) => l.startsWith('@')) +
                  returnStart;

        const returnLines = formattedLines.slice(returnStart, returnEnd + 1);
        formattedLines.splice(returnStart, returnLines.length);
        const returnType = /@returns *{(\w+)}/.exec(returnLines[0])
            ? /@returns *{(\w+)}/.exec(returnLines[0])![1]
            : '';

        const summaryStart: number = formattedLines.findIndex((l) => l.startsWith('@summary'));
        let summaryLines: string[] = [];
        if (summaryStart !== -1) {
            const summaryEnd: number =
                formattedLines.slice(summaryStart + 1).findIndex((l) => l.startsWith('@')) === -1
                    ? formattedLines.length - 1
                    : formattedLines.slice(summaryStart + 1).findIndex((l) => l.startsWith('@')) +
                      summaryStart;

            summaryLines = formattedLines.slice(summaryStart, summaryEnd + 1);
            formattedLines.splice(summaryStart, summaryLines.length);
        }

        const params: Array<[string, string, string]> = [];
        while (formattedLines.find((l) => l.startsWith('@param'))) {
            const paramStart: number = formattedLines.findIndex((l) => l.startsWith('@param'));
            const paramEnd: number =
                formattedLines.slice(paramStart + 1).findIndex((l) => l.startsWith('@')) === -1
                    ? formattedLines.length - 1
                    : formattedLines.slice(paramStart + 1).findIndex((l) => l.startsWith('@')) +
                      paramStart;

            const paramLines = formattedLines.slice(paramStart, paramEnd + 1);
            formattedLines.splice(paramStart, paramLines.length);
            if (/@param *{([ \w<>,'"|]*)} *(\w*)(.*)/.exec(paramLines[0])) {
                params.push([
                    /@param *{([ \w<>,'"|]*)} *(\w*)(.*)/.exec(paramLines[0])![1],
                    /@param *{([ \w<>,'"|]*)} *(\w*)(.*)/.exec(paramLines[0])![2],
                    /@param *{([ \w<>,'"|]*)} *(\w*)(.*)/.exec(paramLines[0])![3],
                ]);
            }
        }

        let descLines: string[] = [];
        if (formattedLines.find((l) => l.startsWith('@description'))) {
            const descStart: number = formattedLines.findIndex((l) => l.startsWith('@description'));
            const descEnd: number =
                formattedLines.slice(descStart + 1).findIndex((l) => l.startsWith('@')) === -1
                    ? formattedLines.length - 1
                    : formattedLines.slice(descStart + 1).findIndex((l) => l.startsWith('@')) +
                      descStart;

            descLines = formattedLines.slice(descStart, descEnd + 1);
        } else if (formattedLines.findIndex((l) => l.startsWith('@')) === -1) {
            descLines = formattedLines;
        } else {
            descLines = formattedLines.slice(
                0,
                formattedLines.findIndex((l) => l.startsWith('@')) + 1
            );
        }
        if (descLines[0] && descLines[0].startsWith('@description')) {
            descLines[0] = descLines[0].slice(12).trim();
        }

        const parameters: ParameterInformation[] = params.map((p) =>
            paramInfo.create(p[1] + ': ' + p[0], p[2].trim())
        );

        const sigInfo: SignatureInformation = {
            label: mixin + '(' + parameters.map((p) => p.label).join(', ') + '): ' + returnType,
            documentation: descLines.join('\n'),
            parameters,
        };
        return {
            activeParameter: activeParam,
            activeSignature: 0,
            signatures: [sigInfo],
        } as SignatureHelp;
    }

    private getSignatureForStateWithParamSelector(
        meta: StylableMeta,
        pos: ProviderPosition,
        line: string
    ): SignatureHelp | null {
        let word = '';
        const posChar = pos.character + 1;
        const parsed = selectorTokenizer.parse(line);
        if (parsed.nodes[0].type === 'selector') {
            let length = 0;
            parsed.nodes[0].nodes.forEach((node: any) => {
                if (node.type === 'invalid') {
                    return; // TODO: refactor - handles places outside of a selector
                } else if (node.type === 'spacing') {
                    length += node.value.length;
                } else {
                    length += node.name.length + 1;
                    if (
                        node.type === 'pseudo-class' &&
                        posChar > length + 1 &&
                        posChar <= length + 2 + node.content.length
                    ) {
                        word = node.name;
                    }
                }
            });
        }

        let stateDef = null as StateParsedValue | string | null;

        if (word) {
            const transformer = new StylableTransformer({
                diagnostics: new Diagnostics(),
                fileProcessor: this.stylable.fileProcessor,
                requireModule: () => {
                    throw new Error('Not implemented, why are we here');
                },
            });
            const resolvedElements = transformer.resolveSelectorElements(meta, line);
            resolvedElements[0][0].resolved.forEach((el) => {
                const symbolStates = (el.symbol as ClassSymbol)[valueMapping.states];
                if (symbolStates && typeof symbolStates[word] === 'object') {
                    stateDef = symbolStates[word];
                }
            });
            if (stateDef && typeof stateDef === 'object') {
                const parameters = resolveStateParams(stateDef);

                const sigInfo: SignatureInformation = {
                    label: `${word}(${parameters})`,
                    parameters: [{ label: parameters }] as ParameterInformation[],
                };

                return {
                    activeParameter: 0,
                    activeSignature: 0,
                    signatures: [sigInfo],
                } as SignatureHelp;
            }
        }
        return null;
    }

    private getSignatureForStateWithParamDefinition(
        pos: ProviderPosition,
        line: string
    ): SignatureHelp | null {
        const res = resolveStateTypeOrValidator(pos, line);

        if (typeof res === 'string') {
            return createStateValidatorSignature(res);
        } else if (typeof res === 'boolean') {
            return createStateTypeSignature();
        } else {
            return null;
        }
    }

    private createProviderOptions(
        src: string,
        position: ProviderPosition,
        meta: StylableMeta,
        fakeRules: postcss.Rule[],
        fullLineText: string,
        cursorPosInLine: number,
        fs: IFileSystem
    ): ProviderOptions {
        const transformer = new StylableTransformer({
            diagnostics: new Diagnostics(),
            fileProcessor: this.stylable.fileProcessor,
            requireModule: () => {
                throw new Error('Not implemented, why are we here');
            },
        });

        const path = pathFromPosition(meta.rawAst, {
            line: position.line + 1,
            character: position.character,
        });
        const astAtCursor: postcss.NodeBase = path[path.length - 1];
        const parentAst: postcss.NodeBase | undefined = (astAtCursor as postcss.Declaration).parent
            ? (astAtCursor as postcss.Declaration).parent
            : undefined;
        const parentSelector: SRule | null =
            parentAst &&
            isSelector(parentAst) &&
            fakeRules.findIndex((f) => {
                return f.selector === parentAst.selector;
            }) === -1
                ? (parentAst as SRule)
                : astAtCursor &&
                  isSelector(astAtCursor) &&
                  fakeRules.findIndex((f) => {
                      return f.selector === astAtCursor.selector;
                  }) === -1
                ? (astAtCursor as SRule)
                : null;

        const { lineChunkAtCursor, fixedCharIndex } = getChunkAtCursor(
            fullLineText,
            cursorPosInLine
        );
        const ps = parseSelector(lineChunkAtCursor, fixedCharIndex);
        const chunkStrings: string[] = ps.selector.reduce((acc, s) => {
            return acc.concat(s.text);
        }, [] as string[]);
        const currentSelector =
            (ps.selector[0] as SelectorChunk).classes[0] ||
            (ps.selector[0] as SelectorChunk).customSelectors[0] ||
            chunkStrings[0];
        const expandedLine: string = expandCustomSelectors(
            postcss.rule({ selector: lineChunkAtCursor }),
            meta.customSelectors
        )
            .split(' ')
            .pop()!; // TODO: replace with selector parser
        const resolvedElements = transformer.resolveSelectorElements(meta, expandedLine);

        let resolved: CSSResolve[] = [];
        if (currentSelector && resolvedElements[0].length) {
            const clas = resolvedElements[0].find(
                (e) => e.type === 'class' || (e.type === 'element' && e.resolved.length > 1)
            ); // TODO: better type parsing
            resolved = clas ? clas.resolved : [];
        }

        return {
            meta,
            fs,
            stylable: this.stylable,
            src,
            tsLangService: this.tsLangService,
            resolvedElements,
            parentSelector,
            astAtCursor,
            lineChunkAtCursor,
            lastSelectoid: ps.lastSelector,
            fullLineText,
            position,
            resolved,
            currentSelector,
            target: ps.target,
            isMediaQuery: isInMediaQuery(path),
            fakes: fakeRules,
        };
    }

    private dedupeComps(completions: Completion[]): Completion[] {
        const uniqs = new Map<string, Completion>();
        completions.forEach((comp) => {
            if (!uniqs.has(comp.label)) {
                uniqs.set(comp.label, comp);
            }
        });
        const res: Completion[] = [];
        uniqs.forEach((v) => res.push(v));
        return res;
    }
}

function isIllegalLine(line: string): boolean {
    return /^\s*[-.:]+\s*$/.test(line);
}

const lineEndsRegexp = /({|}|;)/;

function findRefs(
    word: string,
    defMeta: StylableMeta,
    scannedMeta: StylableMeta,
    callingMeta: StylableMeta,
    stylable: Stylable,
    pos?: Position
): Location[] {
    if (!word) {
        return [];
    }
    const refs: Location[] = [];
    const trans = stylable.createTransformer();

    if (word.startsWith(':global(')) {
        scannedMeta.rawAst.walkRules((rule) => {
            if (rule.selector.includes(word) && rule.source && rule.source.start) {
                refs.push({
                    uri: URI.file(scannedMeta.source).toString(),
                    range: {
                        start: {
                            line: rule.source.start.line - 1,
                            character: rule.selector.indexOf(word) + ':global('.length,
                        },
                        end: {
                            line: rule.source.start.line - 1,
                            character: rule.selector.indexOf(word) + word.length - 1,
                        },
                    },
                });
            }
        });
        return refs;
    }
    const valueRegex = new RegExp('(\\.?' + word + ')(\\s|$|\\:|;|\\)|,)', 'g');
    scannedMeta.rawAst.walkRules((rule) => {
        // Usage in selector
        const filterRegex = new RegExp('(\\.?' + word + ')(\\s|$|\\:|;|\\))', 'g');
        if (filterRegex.test(rule.selector) && !!rule.source && !!rule.source.start) {
            const resScanned = trans.resolveSelectorElements(scannedMeta, rule.selector);
            if (
                resScanned[0].some((rl) => {
                    return (
                        rl.name === word &&
                        rl.resolved.some((i) => i.meta.source === defMeta.source)
                    );
                    // return rl.name === word && last(rl.resolved)!.meta.source === defMeta.source
                })
            ) {
                let match = valueRegex.exec(rule.selector);
                while (match !== null) {
                    const index = match[0].startsWith('.') ? match.index : match.index - 1;
                    refs.push({
                        uri: URI.file(scannedMeta.source).toString(),
                        range: {
                            start: {
                                line: rule.source.start.line - 1,
                                character: rule.source.start.column + index,
                            },
                            end: {
                                line: rule.source.start.line - 1,
                                character: rule.source.start.column + index + word.length,
                            },
                        },
                    });
                    match = valueRegex.exec(rule.selector);
                }
            } else if (
                !!pos &&
                resScanned[0].some((rs) => {
                    const postcsspos = new ProviderPosition(pos.line + 1, pos.character);
                    const pfp = pathFromPosition(callingMeta.rawAst, postcsspos, [], true);
                    const char = isInNode(postcsspos, pfp[pfp.length - 1]) ? 1 : pos.character;
                    const callPs = parseSelector(
                        (pfp[pfp.length - 1] as postcss.Rule).selector,
                        char
                    );
                    const callingElement = findLast(
                        callPs.selector[callPs.target.index].text.slice(
                            0,
                            callPs.target.internalIndex + 1
                        ),
                        (e) => !e.startsWith(':') || e.startsWith('::')
                    );
                    if (!callingElement) {
                        return false;
                    }
                    const selector = (pfp[pfp.length - 1] as postcss.Rule)!.selector;
                    const selectorElement = trans.resolveSelectorElements(
                        callingMeta,
                        selector.slice(0, selector.indexOf(word) + word.length)
                    )[0];
                    const resolvedSelectorElement = selectorElement[selectorElement.length - 1]!
                        .resolved;
                    const lastResolvedSelector =
                        resolvedSelectorElement[resolvedSelectorElement.length - 1];
                    if (
                        rs.resolved.some(
                            (inner) =>
                                inner.meta.source === defMeta.source &&
                                Object.keys(
                                    (inner.symbol as ClassSymbol)[valueMapping.states]!
                                ).includes(word)
                        ) &&
                        rs.resolved[rs.resolved.length - 1].symbol.name ===
                            lastResolvedSelector.symbol.name
                    ) {
                        return true;
                    }
                    return false;
                })
            ) {
                let match = valueRegex.exec(rule.selector);
                while (match !== null) {
                    const index = match[0].startsWith('.') ? match.index : match.index - 1;
                    refs.push({
                        uri: URI.file(scannedMeta.source).toString(),
                        range: {
                            start: {
                                line: rule.source.start.line - 1,
                                character: rule.source.start.column + index,
                            },
                            end: {
                                line: rule.source.start.line - 1,
                                character: rule.source.start.column + index + word.length,
                            },
                        },
                    });

                    match = valueRegex.exec(rule.selector);
                }
            }
        }
    });
    scannedMeta.rawAst.walkDecls((decl) => {
        if (!decl.source || !decl.source.start) {
            return;
        }
        const directiveRegex = new RegExp(
            valueMapping.extends + '|' + valueMapping.named + '|' + valueMapping.default
        );
        if (directiveRegex.test(decl.prop)) {
            // Usage in -st directives
            const reg = new RegExp(valueRegex.source);
            const match = reg.exec(decl.value);
            if (match) {
                refs.push({
                    uri: URI.file(scannedMeta.source).toString(),
                    range: {
                        start: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) -
                                1,
                        },
                        end: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) +
                                word.length -
                                1,
                        },
                    },
                });
            }
        }
    });
    scannedMeta.rawAst.walkDecls((decl) => {
        if (!decl.source || !decl.source.start || !pos) {
            return;
        }
        const directiveRegex = new RegExp(valueMapping.states);
        const postcsspos = new ProviderPosition(pos.line + 1, pos.character);
        const pfp = pathFromPosition(callingMeta.rawAst, postcsspos, [], true);
        const char = isInNode(postcsspos, pfp[pfp.length - 1]) ? 1 : pos.character;
        const callPs = parseSelector((pfp[pfp.length - 1] as postcss.Rule).selector, char);
        const callingElement = findLast(
            callPs.selector[callPs.target.index].text.slice(0, callPs.target.internalIndex + 1),
            (e) => !e.startsWith(':') || e.startsWith('::')
        );
        const blargh = trans.resolveSelectorElements(
            callingMeta,
            (pfp[pfp.length - 1] as postcss.Rule)!.selector
        );
        if (
            directiveRegex.test(decl.prop) &&
            scannedMeta.source === defMeta.source &&
            !!blargh.length &&
            !!callingElement &&
            !!blargh[0].some((inner) => {
                return (
                    inner.name === callingElement.replace(/:/g, '').replace('.', '') &&
                    inner.resolved.some(
                        (s) =>
                            s.symbol.name ===
                            (decl.parent as postcss.Rule).selector.replace('.', '')
                    )
                );
            })
        ) {
            const reg = new RegExp(valueRegex.source);
            const match = reg.exec(decl.value);
            if (match) {
                refs.push({
                    uri: URI.file(scannedMeta.source).toString(),
                    range: {
                        start: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) -
                                1,
                        },
                        end: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) +
                                word.length -
                                1,
                        },
                    },
                });
            }
        }
    });
    scannedMeta.rawAst.walkDecls(valueMapping.mixin, (decl) => {
        // usage in -st-mixin
        if (!decl.source || !decl.source.start) {
            return;
        }
        const lines = decl.value.split('\n');
        lines.forEach((line, index) => {
            let match = valueRegex.exec(line);
            while (match !== null) {
                refs.push({
                    uri: URI.file(scannedMeta.source).toString(),
                    range: {
                        start: {
                            line: decl.source!.start!.line - 1 + index,
                            character: index
                                ? match.index
                                : decl.source!.start!.column +
                                  valueMapping.mixin.length +
                                  match.index +
                                  (decl.raws.between ? decl.raws.between.length : 0) -
                                  1,
                        },
                        end: {
                            line: decl.source!.start!.line - 1 + index,
                            character:
                                word.length +
                                (index
                                    ? match.index
                                    : decl.source!.start!.column +
                                      valueMapping.mixin.length +
                                      match.index +
                                      (decl.raws.between ? decl.raws.between.length : 0) -
                                      1),
                        },
                    },
                });

                match = valueRegex.exec(line);
            }
        });
    });
    scannedMeta.rawAst.walkDecls(word, (decl) => {
        // Variable definition
        if (
            decl.parent.type === 'rule' &&
            decl.parent.selector === ':vars' &&
            !!decl.source &&
            !!decl.source.start
        ) {
            refs.push({
                uri: URI.file(scannedMeta.source).toString(),
                range: {
                    start: {
                        line: decl.source.start.line - 1,
                        character: decl.source.start.column - 1,
                    },
                    end: {
                        line: decl.source.start.line - 1,
                        character: decl.source.start.column + word.length - 1,
                    },
                },
            });
        }
    });
    scannedMeta.rawAst.walkDecls((decl) => {
        // Variable usage
        if (decl.value.includes('value(') && !!decl.source && !!decl.source.start) {
            const usageRegex = new RegExp('value\\(\\s*' + word + '\\s*\\)', 'g');
            const match = usageRegex.exec(decl.value);
            if (match) {
                refs.push({
                    uri: URI.file(scannedMeta.source).toString(),
                    range: {
                        start: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) +
                                'value('.length -
                                1,
                        },
                        end: {
                            line: decl.source.start.line - 1,
                            character:
                                match.index +
                                decl.source.start.column +
                                decl.prop.length +
                                (decl.raws.between ? decl.raws.between.length : 0) +
                                'value('.length +
                                word.length -
                                1,
                        },
                    },
                });
            }
        }
    });
    return refs;
}

function newFindRefs(
    word: string,
    defMeta: StylableMeta,
    callingMeta: StylableMeta,
    stylesheetsPath: string[], // TODO: use docs instead?
    stylable: Stylable,
    pos?: Position
): Location[] {
    let refs: Location[] = [];
    if (word.startsWith(':global(')) {
        // Global selector strings are special
        stylesheetsPath.forEach((stylesheetPath) => {
            const scannedMeta = stylable.process(stylesheetPath);
            scannedMeta.rawAst.walkRules((rule) => {
                if (rule.selector.includes(word)) {
                    refs = refs.concat(findRefs(word, defMeta, scannedMeta, callingMeta, stylable));
                }
            });
        });
        return refs;
    } else {
        word = word.replace('.', '');
    }
    if (!defMeta.mappedSymbols[word] && !word.startsWith(word.charAt(0).toLowerCase())) {
        // Default import
        stylesheetsPath.forEach((stylesheetPath) => {
            const scannedMeta = stylable.process(stylesheetPath);
            let tmp = '';
            if (
                Object.keys(scannedMeta.mappedSymbols).some((k) => {
                    tmp = k;
                    return (
                        (scannedMeta.mappedSymbols[k]._kind === 'element' &&
                            (scannedMeta.mappedSymbols[k] as ElementSymbol).alias &&
                            (scannedMeta.mappedSymbols[k] as ElementSymbol).alias!.import.from ===
                                defMeta.source) ||
                        (scannedMeta.mappedSymbols[k]._kind === 'import' &&
                            (scannedMeta.mappedSymbols[k] as ImportSymbol).import.from ===
                                defMeta.source)
                    );
                })
            ) {
                refs = refs.concat(findRefs(tmp, defMeta, scannedMeta, callingMeta, stylable));
            }
        });
    } else if (defMeta.mappedSymbols[word] && defMeta.mappedSymbols[word]._kind === 'var') {
        // Variable
        stylesheetsPath.forEach((stylesheetPath) => {
            const scannedMeta = stylable.process(stylesheetPath);
            if (
                !scannedMeta.mappedSymbols[word] ||
                (scannedMeta.mappedSymbols[word]._kind !== 'var' &&
                    scannedMeta.mappedSymbols[word]._kind !== 'import')
            ) {
                return;
            }
            if (scannedMeta.source === defMeta.source) {
                // We're in the defining file
                refs = refs.concat(
                    findRefs(word.replace('.', ''), defMeta, scannedMeta, callingMeta, stylable)
                );
            } else {
                // We're in a using file
                const newSymb = stylable.resolver.deepResolve(scannedMeta.mappedSymbols[word]);
                if (!newSymb || !newSymb.meta) {
                    return;
                }
                if (newSymb.meta.source === defMeta.source) {
                    refs = refs.concat(
                        findRefs(word.replace('.', ''), defMeta, scannedMeta, callingMeta, stylable)
                    );
                }
            }
        });
    } else if (
        defMeta.mappedSymbols[word] &&
        (defMeta.mappedSymbols[word]._kind === 'class' ||
            defMeta.mappedSymbols[word]._kind === 'import')
    ) {
        // Elements
        const trans = stylable.createTransformer();
        const valueRegex = new RegExp('(\\.?' + word + ')\\b', 'g');
        stylesheetsPath.forEach((stylesheetPath) => {
            const scannedMeta = stylable.process(stylesheetPath);
            let done = false;
            scannedMeta.rawAst.walkRules((r) => {
                if (valueRegex.test(r.selector) && !done) {
                    const resolved = trans.resolveSelectorElements(scannedMeta, r.selector);
                    const resolvedInner = resolved[0].find((r) => r.name === word);
                    if (
                        resolvedInner &&
                        resolvedInner.resolved.some((r) => r.meta.source === defMeta.source)
                    ) {
                        refs = refs.concat(
                            findRefs(
                                word.replace('.', ''),
                                defMeta,
                                scannedMeta,
                                callingMeta,
                                stylable
                            )
                        );
                        done = true;
                    }
                }
            });
            scannedMeta.rawAst.walkDecls((d) => {
                if (valueRegex.test(d.value) && !done) {
                    if (
                        d.prop === valueMapping.named &&
                        d.parent.nodes!.find((n) => {
                            return (
                                (n as postcss.Declaration).prop === valueMapping.from &&
                                path.resolve(
                                    path.dirname(scannedMeta.source),
                                    (n as postcss.Declaration).value.replace(/"/g, '')
                                ) === defMeta.source
                            );
                        })
                    ) {
                        refs = refs.concat(
                            findRefs(
                                word.replace('.', ''),
                                defMeta,
                                scannedMeta,
                                callingMeta,
                                stylable
                            )
                        );
                        done = true;
                    }
                }
            });
        });
    } else if (
        Object.values(defMeta.mappedSymbols).some((sym) => {
            const symbolStates = sym._kind === 'class' && sym[valueMapping.states];
            // states
            return (
                sym._kind === 'class' &&
                symbolStates &&
                Object.keys(symbolStates).some((k) => {
                    if (k === word && !!pos) {
                        const postcsspos = new ProviderPosition(pos.line + 1, pos.character);
                        const pfp = pathFromPosition(callingMeta.rawAst, postcsspos, [], true);
                        const selec = (pfp[pfp.length - 1] as postcss.Rule).selector;
                        // If called from -st-state, i.e. inside node, pos is not in selector.
                        // Use 1 and not 0 for selector that starts with'.'
                        const char = isInNode(postcsspos, pfp[pfp.length - 1]) ? 1 : pos.character;
                        const parsel = parseSelector(selec, char);
                        const t = parsel.target;
                        const arr = Array.isArray(t.focusChunk)
                            ? (t.focusChunk as SelectorQuery[])[t.index].text
                            : t.focusChunk.text;
                        let name = findLast(
                            arr,
                            (str: string) => !str.startsWith(':') || str.startsWith('::')
                        );
                        const trans = stylable.createTransformer();
                        const pse = trans.resolveSelectorElements(callingMeta, selec);
                        name = name!.replace('.', '').replace(/:/g, '');
                        if (
                            !!pse &&
                            !!pse[0].some(
                                (psInner) =>
                                    psInner.name === name &&
                                    psInner.resolved.some((r) => r.symbol.name === sym.name)
                            )
                        ) {
                            return true;
                        }
                    }
                    return false;
                })
            );
        })
    ) {
        stylesheetsPath.forEach((stylesheetPath) => {
            const scannedMeta = stylable.process(stylesheetPath);
            let done = false;
            if (defMeta.source === scannedMeta.source) {
                refs = refs.concat(
                    findRefs(
                        word.replace('.', ''),
                        defMeta,
                        scannedMeta,
                        callingMeta,
                        stylable,
                        pos
                    )
                );
                return;
            }
            if (!pos) {
                return;
            }
            const trans = stylable.createTransformer();
            scannedMeta.rawAst.walkRules((r) => {
                if (r.selector.includes(':' + word) && !done) {
                    // Won't work if word appears elsewhere in string
                    const parsed = parseSelector(r.selector, r.selector.indexOf(word));
                    const elem =
                        (parsed.selector[parsed.target.index] as SelectorChunk).type === '*' ||
                        !(parsed.selector[parsed.target.index] as SelectorChunk).type.startsWith(
                            (parsed.selector[parsed.target.index] as SelectorChunk).type
                                .charAt(0)
                                .toLowerCase()
                        )
                            ? findLast(
                                  (parsed.selector[parsed.target.index] as SelectorChunk).text,
                                  (str: string) => !str.startsWith(':') || str.startsWith('::')
                              )!.replace('.', '')
                            : (parsed.selector[parsed.target.index] as SelectorInternalChunk).name;
                    const reso = trans.resolveSelectorElements(scannedMeta, r.selector);
                    const symb = reso[0].find((o) => o.name === elem);
                    if (
                        !!symb &&
                        symb.resolved.some((inner) => {
                            if (inner.symbol._kind === 'class') {
                                const symbolStates = inner.symbol[valueMapping.states];

                                return (
                                    symbolStates &&
                                    inner.meta.source === defMeta.source &&
                                    Object.keys(symbolStates).includes(word)
                                );
                            }
                            return false;
                        })
                    ) {
                        refs = refs.concat(
                            findRefs(
                                word.replace('.', ''),
                                defMeta,
                                scannedMeta,
                                callingMeta,
                                stylable,
                                pos
                            )
                        );
                        done = true;
                    }
                }
            });
        });
    }
    return refs;
}

export function getRenameRefs(
    filePath: string,
    pos: ProviderPosition,
    fs: IFileSystem,
    stylable: Stylable
): Location[] {
    const refs = getRefs(filePath, pos, fs, stylable);
    const newRefs: Location[] = [];
    refs.forEach((ref) => {
        const FISH = URI.parse(ref.uri).path.startsWith(stylable.projectRoot);
        const isRefInProject = ref.uri.startsWith(stylable.projectRoot);

        if (!ref.uri.includes('node_modules') && (FISH || isRefInProject)) {
            newRefs.push(ref);
        }
    });
    return newRefs;
}

export function getRefs(
    filePath: string,
    position: ProviderPosition,
    fs: IFileSystem,
    stylable: Stylable
): Location[] {
    const callingMeta = stylable.process(filePath);

    const symb = getDefSymbol(fs.readFileSync(filePath, 'utf8'), position, filePath, stylable);

    if (!symb.meta) {
        return [];
    }

    const stylesheets: string[] = fs
        .findFilesSync(stylable.projectRoot, {
            filterFile: (fileDesc: IFileSystemDescriptor) => {
                return fileDesc.name.endsWith('.st.css');
            },
        })
        .map((stylesheetPath) => URI.file(stylesheetPath).fsPath);

    return newFindRefs(symb.word, symb.meta, callingMeta, stylesheets, stylable, position);
}

export function createMeta(src: string, path: string) {
    let meta: StylableMeta;
    const fakes: postcss.Rule[] = [];
    try {
        const ast: postcss.Root = safeParse(src, { from: URI.file(path).fsPath });
        if (ast.nodes) {
            for (const node of ast.nodes) {
                if (node.type === 'decl') {
                    const r = postcss.rule({ selector: node.prop + ':' + node.value });
                    r.source = node.source;
                    node.replaceWith(r);
                    fakes.push(r);
                }
            }
        }
        if (ast.raws.after && ast.raws.after.trim()) {
            const r = postcss.rule({ selector: ast.raws.after.trim() });
            ast.append(r);
            fakes.push(r);
        }

        meta = stylableProcess(ast);
    } catch (error) {
        return { meta: null, fakes };
    }
    return {
        meta,
        fakes,
    };
}

export function fixAndProcess(src: string, position: ProviderPosition, filePath: string) {
    let cursorLineIndex: number = position.character;
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    let currentLine = lines[position.line];
    let fixedSrc = src;
    if (currentLine.match(lineEndsRegexp)) {
        let currentLocation = 0;
        const splitLine = currentLine.split(lineEndsRegexp);
        for (let i = 0; i < splitLine.length; i += 2) {
            currentLocation += splitLine[i].length + 1;
            if (currentLocation >= position.character) {
                currentLine = splitLine[i];
                if (isIllegalLine(currentLine)) {
                    splitLine[i] = '\n';
                    lines.splice(position.line, 1, splitLine.join(''));
                    fixedSrc = lines.join('\n');
                }
                break;
            } else {
                cursorLineIndex -= splitLine[i].length + 1;
            }
        }
    } else if (isIllegalLine(currentLine)) {
        lines.splice(position.line, 1, '');
        fixedSrc = lines.join('\n');
    }

    const processed = createMeta(fixedSrc, filePath);
    return {
        processed,
        currentLine,
        cursorLineIndex,
    };
}

export class ProviderLocation {
    constructor(public uri: string, public range: ProviderRange) {}
}

export function extractTsSignature(
    filePath: string,
    mixin: string,
    isDefault: boolean,
    tsLangService: ExtendedTsLanguageService
): ts.Signature | undefined {
    tsLangService.setOpenedFiles([filePath]);
    const program = tsLangService.ts.getProgram();
    if (!program) {
        return;
    }
    const tc = program.getTypeChecker();
    const sf = program.getSourceFile(filePath);
    if (!sf) {
        return;
    }
    const mix = tc.getSymbolsInScope(sf, ts.SymbolFlags.Function).find((f) => {
        if (isDefault) {
            return (f as any).exportSymbol && (f as any).exportSymbol.escapedName === 'default';
        } else {
            return (f as any).exportSymbol && (f as any).exportSymbol.escapedName === mixin;
        }
    });
    if (!mix) {
        return;
    }
    return tc.getSignatureFromDeclaration(mix.declarations[0] as ts.SignatureDeclaration);
}

export function extractJsModifierReturnType(mixin: string, fileSrc: string): string {
    const lines = fileSrc.split('\n');
    const mixinLine: number = lines.findIndex((l) => l.trim().startsWith('exports.' + mixin));
    const docStartLine: number = lines.slice(0, mixinLine).lastIndexOf(
        lines
            .slice(0, mixinLine)
            .reverse()
            .find((l) => l.trim().startsWith('/**'))!
    );
    const docLines = lines.slice(docStartLine, mixinLine);
    const formattedLines: string[] = [];

    docLines.forEach((l) => {
        if (l.trim().startsWith('*/')) {
            return;
        }
        if (l.trim().startsWith('/**') && !!l.trim().slice(3).trim()) {
            formattedLines.push(l.trim().slice(3).trim());
        }
        if (l.trim().startsWith('*')) {
            formattedLines.push(l.trim().slice(1).trim());
        }
    });

    const returnStart: number = formattedLines.findIndex((l) => l.startsWith('@returns'));
    const returnEnd: number =
        formattedLines.slice(returnStart + 1).findIndex((l) => l.startsWith('@')) === -1
            ? formattedLines.length - 1
            : formattedLines.slice(returnStart + 1).findIndex((l) => l.startsWith('@')) +
              returnStart;

    const returnLines = formattedLines.slice(returnStart, returnEnd + 1);
    formattedLines.splice(returnStart, returnLines.length);
    const returnType = /@returns *{(\w+)}/.exec(returnLines[0])
        ? /@returns *{(\w+)}/.exec(returnLines[0])![1]
        : '';
    return returnType;
}

function isInMediaQuery(path: postcss.NodeBase[]) {
    return path.some(
        (n) => (n as postcss.Container).type === 'atrule' && (n as postcss.AtRule).name === 'media'
    );
}

export function isDirective(line: string) {
    return Object.keys(valueMapping).some((k) => line.trim().startsWith((valueMapping as any)[k]));
}

function isNamedDirective(line: string) {
    return line.includes(valueMapping.named);
}

export function isInValue(lineText: string, position: ProviderPosition) {
    let isInValue = false;

    if (lineText.includes('value(')) {
        const line = lineText.slice(0, position.character);
        let stack = 0;
        for (let i = 0; i <= line.length; i++) {
            if (line[i] === '(') {
                stack += 1;
            } else if (line[i] === ')') {
                stack -= 1;
            }
        }
        if (stack > 0) {
            isInValue = true;
        }
    }
    return isInValue;
}

function getChunkAtCursor(
    fullLineText: string,
    cursorPosInLine: number
): { lineChunkAtCursor: string; fixedCharIndex: number } {
    let fixedCharIndex = cursorPosInLine;
    let lineChunkAtCursor = fullLineText;
    while (lineChunkAtCursor.lastIndexOf(' ') >= cursorPosInLine) {
        lineChunkAtCursor = lineChunkAtCursor.slice(0, lineChunkAtCursor.lastIndexOf(' '));
    }
    if (
        !isDirective(lineChunkAtCursor) &&
        lineChunkAtCursor.lastIndexOf(' ') > -1 &&
        lineChunkAtCursor.lastIndexOf(' ') < cursorPosInLine
    ) {
        fixedCharIndex -= lineChunkAtCursor.lastIndexOf(' ') + 1;
        lineChunkAtCursor = lineChunkAtCursor.slice(lineChunkAtCursor.lastIndexOf(' '));
    }
    return { lineChunkAtCursor: lineChunkAtCursor.trim(), fixedCharIndex };
}

export function getNamedValues(
    src: string,
    lineIndex: number
): { isNamedValueLine: boolean; namedValues: string[] } {
    const lines = src.split('\n');
    let isNamedValueLine = false;
    const namedValues: string[] = [];

    for (let i = lineIndex; i > 0; i--) {
        if (isDirective(lines[i]) && !isNamedDirective(lines[i])) {
            break;
        } else if (isNamedDirective(lines[i])) {
            isNamedValueLine = true;
            const valueStart = lines[i].indexOf(':') + 1;
            const value = lines[i].slice(valueStart);
            value
                .split(',')
                .map((x) => x.trim())
                .filter((x) => x !== '')
                .forEach((x) => namedValues.push(x));
            break;
        } else {
            const valueStart = lines[i].indexOf(':') + 1;
            const value = lines[i].slice(valueStart);
            value
                .split(',')
                .map((x) => x.trim())
                .filter((x) => x !== '')
                .forEach((x) => namedValues.push(x));
        }
    }

    return { isNamedValueLine, namedValues };
}

export function getExistingNames(lineText: string, position: ProviderPosition) {
    const valueStart = lineText.indexOf(':') + 1;
    const value = lineText.slice(valueStart, position.character);
    const parsed = postcssValueParser(value.trim());
    const names: string[] = parsed.nodes
        .filter((n: any) => n.type === 'function' || n.type === 'word')
        .map((n: any) => n.value);
    const rev = parsed.nodes.reverse();
    const lastName: string = parsed.nodes.length && rev[0].type === 'word' ? rev[0].value : '';
    return { names, lastName };
}

function findNode(nodes: any[], index: number): any {
    return nodes
        .filter((n) => n.sourceIndex <= index)
        .reduce(
            (m, n) => {
                return m.sourceIndex > n.sourceIndex ? m : n;
            },
            { sourceIndex: -1 }
        );
}

export function getDefSymbol(
    src: string,
    position: ProviderPosition,
    filePath: string,
    stylable: Stylable
) {
    const res = fixAndProcess(src, position, filePath);
    let meta = res.processed.meta;
    if (!meta) {
        return { word: '', meta: null };
    }

    const parsed: any[] = postcssValueParser(res.currentLine).nodes;

    let val = findNode(parsed, position.character);
    while (val.nodes && val.nodes.length > 0) {
        if (findNode(val.nodes, position.character).sourceIndex >= 0) {
            val = findNode(val.nodes, position.character);
        } else {
            break;
        }
    }

    const word: string = val.value;

    const { lineChunkAtCursor } = getChunkAtCursor(
        res.currentLine.slice(0, val.sourceIndex + val.value.length),
        position.character
    );
    const directiveRegex = new RegExp(
        valueMapping.extends +
            '|' +
            valueMapping.named +
            '|' +
            valueMapping.default +
            '|' +
            valueMapping.mixin
    );
    if (lineChunkAtCursor.startsWith(':global')) {
        return { word: ':global(' + word + ')', meta };
    }

    const match = lineChunkAtCursor.match(directiveRegex);
    if (match && !!meta.mappedSymbols[word]) {
        // We're in an -st directive
        let imp;
        if (meta.mappedSymbols[word]._kind === 'import') {
            imp = stylable.resolver.resolveImport(meta.mappedSymbols[word] as ImportSymbol);
        } else if (
            meta.mappedSymbols[word]._kind === 'element' &&
            (meta.mappedSymbols[word] as ElementSymbol).alias
        ) {
            imp = stylable.resolver.resolveImport(
                (meta.mappedSymbols[word] as ElementSymbol).alias as ImportSymbol
            );
        } else if (meta.mappedSymbols[word]._kind === 'class') {
            if ((meta.mappedSymbols[word] as ClassSymbol).alias) {
                meta = (stylable.resolver.resolveImport(
                    (meta.mappedSymbols[word] as ClassSymbol).alias!
                ) as CSSResolve).meta;
            }
            return { word, meta };
        }
        if (imp) {
            if (imp._kind === 'js') {
                return { word, meta };
            } else {
                return { word, meta: imp.meta };
            }
        } else {
            return { word: '', meta: null };
        }
    }

    const varRegex = new RegExp('value\\(\\s*' + word);
    if (varRegex.test(lineChunkAtCursor)) {
        // we're looking at a var usage
        if (!meta.mappedSymbols[word]) {
            return { word, meta: null };
        } else if (meta.mappedSymbols[word]._kind === 'var') {
            // deepResolve doesn't do local symbols
            return { word, meta };
        }
        const resolvedVar = stylable.resolver.deepResolve(meta.mappedSymbols[word]);
        if (resolvedVar) {
            return { word, meta: resolvedVar.meta };
        } else {
            return { word, meta: null };
        }
    }

    const transformer = new StylableTransformer({
        diagnostics: new Diagnostics(),
        fileProcessor: stylable.fileProcessor,
        requireModule: () => {
            throw new Error('Not implemented, why are we here');
        },
    });

    const expandedLine: string = expandCustomSelectors(
        postcss.rule({ selector: lineChunkAtCursor }),
        meta.customSelectors
    )
        .split(' ')
        .pop()!; // TODO: replace with selector parser
    const resolvedElements = transformer.resolveSelectorElements(meta, expandedLine);

    let reso: CSSResolve | undefined;
    if (!word.startsWith(word.charAt(0).toLowerCase())) {
        reso = resolvedElements[0][resolvedElements[0].length - 1].resolved.find(
            (res) => !!(res.symbol as ClassSymbol)['-st-root']
        );
    } else {
        reso = resolvedElements[0][resolvedElements[0].length - 1].resolved.find((res) => {
            let symbolStates;
            if (res.symbol._kind === 'class') {
                symbolStates = res.symbol[valueMapping.states];
            }
            return (
                (res.symbol.name === word.replace('.', '') && !(res.symbol as ClassSymbol).alias) ||
                (symbolStates && Object.keys(symbolStates).some((k) => k === word))
            );
        });
    }

    if (reso) {
        meta = reso.meta;
    }
    return { word, meta };
}
