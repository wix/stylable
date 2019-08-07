import { createCjsModuleSystem } from '@file-services/commonjs';
import { createMemoryFs } from '@file-services/memory';
import {
    IPCMessageReader,
    IPCMessageWriter,
    ReferenceParams,
    TextDocument,
    TextDocumentItem
} from 'vscode-languageserver-protocol';
import { Location } from 'vscode-languageserver-types';

import { createConnection, IConnection, TextDocuments } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { createRange } from '../../src/lib/completion-providers';
import { connect } from '../../src/lib/server';
import { StylableLanguageService } from '../../src/lib/service';
import { TestConnection } from '../lsp-testkit/connection.spec';
import { createExpectedDiagnosis, trimLiteral } from '../lsp-testkit/diagnostic-test-kit';
import { expect, plan } from '../testkit/chai.spec';
import { getRangeAndText } from '../testkit/text.spec';
import { createColor } from './colors.spec';
import { TestDocuments } from './test-documents';

xdescribe('Service component test', () => {
    let testCon: TestConnection;

    beforeEach(() => {
        testCon = new TestConnection();
        testCon.listen();
    });

    describe('Diagnostics', () => {
        it(
            'Diagnostics - single file error',
            plan(1, async () => {
                const rangeAndText = getRangeAndText('|.gaga .root{}|');
                const connection: IConnection = createConnection(
                    new IPCMessageReader(process),
                    new IPCMessageWriter(process)
                );
                const baseFileName = '/base-file.st.css';
                const baseTextDocument = TextDocument.create(
                    URI.file(baseFileName).toString(),
                    'stylable',
                    0,
                    rangeAndText.text
                );
                const expectedDiagnostics = [
                    createExpectedDiagnosis(
                        rangeAndText.range,
                        // tslint:disable-next-line: max-line-length
                        '".root" class cannot be used after native elements or selectors external to the stylesheet'
                    )
                ];

                const memFs = createMemoryFs({ [baseFileName]: rangeAndText.text });
                const { requireModule } = createCjsModuleSystem({ fs: memFs });
                const stylableLSP = new StylableLanguageService({
                    fs: memFs,
                    requireModule,
                    rootPath: '/',
                    textDocuments: new TestDocuments({
                        [baseTextDocument.uri]: baseTextDocument
                    })
                });

                const diagnostics = await stylableLSP.diagnose(connection)();
                expect(diagnostics).to.deep.equal(expectedDiagnostics);
            })
        );

        it(
            'Diagnostics - cross-file errors',
            plan(1, async () => {
                const baseFilecContent = trimLiteral`
            |.gaga {
            |    -st-states: aState
            |}
            `;
                const topFileContent = trimLiteral`
            |:import {
            |    -st-from: "./base-file.st.css";
            |    -st-named: gaga;
            |}
            |
            |.root .gaga:aState:bState {
            |    color: red;
            |}
            `;
                const connection: IConnection = createConnection(
                    new IPCMessageReader(process),
                    new IPCMessageWriter(process)
                );
                const baseFileName = '/base-file.st.css';
                const topFileName = '/top-file.st.css';
                const baseTextDocument = TextDocument.create(
                    URI.file(baseFileName).toString(),
                    'stylable',
                    0,
                    baseFilecContent
                );
                const topTextDocument = TextDocument.create(
                    URI.file(topFileName).toString(),
                    'stylable',
                    0,
                    topFileContent
                );
                const expectedDiagnostics = [
                    createExpectedDiagnosis(
                        createRange(5, 19, 5, 25),
                        'unknown pseudo-state "bState"'
                    )
                ];

                const memFs = createMemoryFs({
                    [baseFileName]: baseFilecContent,
                    [topFileName]: topFileContent
                });
                const { requireModule } = createCjsModuleSystem({ fs: memFs });

                const stylableLSP = new StylableLanguageService({
                    fs: memFs,
                    requireModule,
                    rootPath: '/',
                    textDocuments: new TestDocuments({
                        [baseTextDocument.uri]: baseTextDocument,
                        [topTextDocument.uri]: topTextDocument
                    })
                });

                const diagnostics = await stylableLSP.diagnose(connection)();
                expect(diagnostics).to.deep.equal(expectedDiagnostics);
            })
        );

        it(
            'Diagnostics - CSS errors',
            plan(1, async () => {
                const baseFilecContent = trimLiteral`
            |:vars {
            |  varvar: binks;
            |}
            |.gaga:aState {
            |  color: red;
            |  colorr: reddish;
            |}
            |.root {
            |  -st-states: someState(string);
            |}
            |.root:someState(T1) { /* css-identifierexpected */
            |
            |}
            |.root:someState(T1.1) { /* css-rparentexpected */
            |
            |}
            `;

                const connection: IConnection = createConnection(
                    new IPCMessageReader(process),
                    new IPCMessageWriter(process)
                );
                const baseFileName = '/base-file.st.css';
                const baseTextDocument = TextDocument.create(
                    URI.file(baseFileName).toString(),
                    'stylable',
                    0,
                    baseFilecContent
                );
                const expectedDiagnostics = [
                    // CSS diagnostics that shouldn't appear:
                    // empty ruleset, unknown property 'varavar', css-rparentexpected, css-identifierexpected
                    createExpectedDiagnosis(
                        createRange(3, 6, 3, 12),
                        'unknown pseudo-state "aState"'
                    ),
                    createExpectedDiagnosis(
                        createRange(5, 2, 5, 8),
                        "Unknown property: 'colorr'",
                        'css',
                        'unknownProperties'
                    )
                ];

                const memFs = createMemoryFs({ [baseFileName]: baseFilecContent });
                const { requireModule } = createCjsModuleSystem({ fs: memFs });

                const stylableLSP = new StylableLanguageService({
                    fs: memFs,
                    requireModule,
                    rootPath: '/',
                    textDocuments: new TestDocuments({
                        [baseTextDocument.uri]: baseTextDocument
                    })
                });

                const diagnostics = await stylableLSP.diagnose(connection)();
                expect(diagnostics).to.deep.equal(expectedDiagnostics);
            })
        );
    });

    it(
        'Document Colors - local, vars, imported',
        plan(2, async () => {
            const baseFilecContent = trimLiteral`
        |:vars {
        |    myColor: rgba(0, 255, 0, 0.8);
        |}
        |
        |.root {
        |    color: value(myColor);
        |}
        `;

            const importFileContent = trimLiteral`
        |:import {
        |    -st-from: "./single-file-color.st.css";
        |    -st-named: myColor;
        |}
        `;

            const baseFileName = '/single-file-color.st.css';
            const importFileName = '/import-color.st.css';
            const baseFileUri = URI.file(baseFileName).toString();
            const importedFileUri = URI.file(importFileName).toString();

            const baseTextDocument = TextDocument.create(
                baseFileUri,
                'stylable',
                0,
                baseFilecContent
            );
            const importTextDocument = TextDocument.create(
                importedFileUri,
                'stylable',
                0,
                importFileContent
            );

            const range1 = createRange(5, 11, 5, 24);
            const range2 = createRange(1, 13, 1, 33);
            const range3 = createRange(2, 15, 2, 22);
            const color = createColor(0, 1, 0, 0.8);

            const memFs = createMemoryFs({
                [baseFileName]: baseFilecContent,
                [importFileName]: importFileContent
            });
            const { requireModule } = createCjsModuleSystem({ fs: memFs });

            const stylableLSP = new StylableLanguageService({
                fs: memFs,
                requireModule,
                rootPath: '/',
                textDocuments: new TestDocuments({
                    [baseTextDocument.uri]: baseTextDocument,
                    [importTextDocument.uri]: importTextDocument
                })
            });

            const docColors = stylableLSP.onDocumentColor({ textDocument: { uri: baseFileUri } });
            const importDocColors = stylableLSP.onDocumentColor({
                textDocument: { uri: importedFileUri }
            });

            expect(docColors).to.eql([
                {
                    range: range1,
                    color
                },
                {
                    range: range2,
                    color
                }
            ]);

            expect(importDocColors).to.eql([
                {
                    range: range3,
                    color
                }
            ]);
        })
    );

    describe('References', () => {
        xit(
            'References - local file',
            plan(3, async () => {
                const fileText = trimLiteral`
                |  .gaga {
                |   -st-states: active;
                |    color: red;
                |}
                |
                |.gaga:active .gaga {
                |    background-color: fuchsia;
                |}
                |
                |.lokal {
                |    -st-extends:      gaga;
                |}
                |
                |.mixed {
                |    -st-mixin: lokal,
                |    gaga, lokal,
                |    gaga;
                |}`;

                const filePath = '/references.st.css';
                const textDocument = TextDocument.create(
                    URI.file(filePath).toString(),
                    'stylable',
                    0,
                    fileText
                );
                const memFs = createMemoryFs({ [filePath]: fileText });
                const { requireModule } = createCjsModuleSystem({ fs: memFs });

                const stylableLSP = new StylableLanguageService({
                    fs: memFs,
                    requireModule,
                    rootPath: '/',
                    textDocuments: new TestDocuments({
                        [textDocument.uri]: textDocument
                    })
                });

                const context = { includeDeclaration: true };
                const refsInSelector = stylableLSP.onReferences({
                    context,
                    position: { line: 5, character: 16 },
                    textDocument
                });
                const refsInMixin = stylableLSP.onReferences({
                    context,
                    position: { line: 10, character: 25 },
                    textDocument
                });
                const refsInExtends = stylableLSP.onReferences({
                    context,
                    position: { line: 15, character: 6 },
                    textDocument
                });

                const expectedRefs = [
                    // Refs should be listed in the order they appear in the file
                    Location.create(textDocument.uri, createRange(0, 3, 0, 7)),
                    Location.create(textDocument.uri, createRange(5, 1, 5, 5)),
                    Location.create(textDocument.uri, createRange(5, 14, 5, 18)),
                    Location.create(textDocument.uri, createRange(10, 22, 10, 26)),
                    Location.create(textDocument.uri, createRange(15, 4, 15, 8)),
                    Location.create(textDocument.uri, createRange(16, 4, 16, 8))
                ];

                expect(refsInSelector).to.eql(expectedRefs);
                expect(refsInMixin).to.eql(expectedRefs);
                expect(refsInExtends).to.eql(expectedRefs);
            })
        );

        xit(
            'References - cross-file',
            plan(4, async () => {
                // Not implemented yet
                const topFileText = trimLiteral`
            |:import {
            |    -st-from: "./import.st.css";
            |    -st-named: gaga;
            |}
            |
            |.baga {
            |    -st-extends: gaga;
            |    background-color: goldenrod;
            |}`;

                const baseFileText = trimLiteral`
            |.gaga {
            |    -st-states: aState
            |}
            |
            |.gaga:aState {
            |    color:blue;
            |    mask: lala
            |}
            `;

                const baseFileName = 'import.st.css';
                const topFileName = 'top.st.css';
                const fileSystem = createMemoryFs({
                    [baseFileName]: baseFileText,
                    [topFileName]: topFileText
                });

                const stylableLSP = new StylableLanguageService({
                    fs: fileSystem,
                    requireModule: require,
                    rootPath: '/',
                    textDocuments: new TextDocuments()
                });
                connect(
                    stylableLSP,
                    testCon.server
                );

                const context = { includeDeclaration: true };
                const baseTextDocument = TextDocumentItem.create(
                    URI.file('/' + baseFileName).toString(),
                    'stylable',
                    0,
                    fileSystem.readFileSync(baseFileName, 'utf8')
                );
                const topTextDocument = TextDocumentItem.create(
                    URI.file('/' + topFileName).toString(),
                    'stylable',
                    0,
                    fileSystem.readFileSync(topFileName, 'utf8')
                );

                const refRequests: ReferenceParams[] = [
                    {
                        context,
                        textDocument: baseTextDocument,
                        position: { line: 0, character: 3 }
                    },
                    {
                        context,
                        textDocument: baseTextDocument,
                        position: { line: 4, character: 2 }
                    },
                    {
                        context,
                        textDocument: topTextDocument,
                        position: { line: 2, character: 18 }
                    },
                    { context, textDocument: topTextDocument, position: { line: 6, character: 20 } }
                ];

                const expectedRefs = [
                    // Refs should be listed in the order they appear in each file, current file first.
                    Location.create(baseTextDocument.uri, createRange(0, 1, 0, 5)),
                    Location.create(baseTextDocument.uri, createRange(4, 1, 4, 5)),
                    Location.create(topTextDocument.uri, createRange(2, 15, 2, 19)),
                    Location.create(topTextDocument.uri, createRange(6, 17, 6, 21))
                ];

                refRequests.forEach(async refReq => {
                    const actualRefs = await testCon.client.references({
                        context,
                        textDocument: refReq.textDocument,
                        position: refReq.position
                    });
                    expect(actualRefs).to.eql(expectedRefs);
                });
            })
        );
    });

    xit(
        'Rename Symbol - local file',
        plan(3, async () => {
            const fileText = trimLiteral`
            |  .gaga {
            |    -st-states: active;
            |    color: red;
            |}
            |
            |.gaga:active .gaga {
            |    background-color: fuchsia;
            |}
            |
            |.lokal {
            |    -st-extends:      gaga;
            |}
            |
            |.mixed {
            |    -st-mixin: lokal,
            |    gaga, lokal,
            |    gaga;
            |}`;

            const fileName = 'references.st.css';
            const fileSystem = createMemoryFs({ [fileName]: fileText });

            const stylableLSP = new StylableLanguageService({
                fs: fileSystem,
                requireModule: require,
                rootPath: '/',
                textDocuments: new TextDocuments()
            });
            connect(
                stylableLSP,
                testCon.server
            );

            const context = { includeDeclaration: true };
            const textDocument = TextDocumentItem.create(
                URI.file('/' + fileName).toString(),
                'stylable',
                0,
                fileSystem.readFileSync(fileName, 'utf8')
            );
            const refsInSelector = await testCon.client.references({
                context,
                textDocument,
                position: { line: 5, character: 16 }
            });
            const refsInMixin = await testCon.client.references({
                context,
                textDocument,
                position: { line: 10, character: 25 }
            });
            const refsInExtends = await testCon.client.references({
                context,
                textDocument,
                position: { line: 15, character: 6 }
            });
            const expectedRefs = [
                // Refs should be listed in the order they appear in the file
                Location.create(textDocument.uri, createRange(0, 3, 0, 7)),
                Location.create(textDocument.uri, createRange(5, 1, 5, 5)),
                Location.create(textDocument.uri, createRange(5, 14, 5, 18)),
                Location.create(textDocument.uri, createRange(10, 22, 10, 26)),
                Location.create(textDocument.uri, createRange(15, 4, 15, 8)),
                Location.create(textDocument.uri, createRange(16, 4, 16, 8))
            ];

            expect(refsInSelector).to.eql(expectedRefs);
            expect(refsInMixin).to.eql(expectedRefs);
            expect(refsInExtends).to.eql(expectedRefs);
        })
    );

    xit(
        'Definitions - element',
        plan(5, async () => {
            // File system issue
            const topFileText = trimLiteral`
        |:import {
        |    -st-from: "./import.st.css";
        |    -st-named: momo;
        |}
        |
        |.local {
        |    -st-extends: momo;
        |}
        |
        |.local:momo {
        |    color: blue;
        |}`;

            const importFileText = trimLiteral`
        |.shlomo {
        |    color: black;
        |}
        |
        |.momo {
        |    -st-states: anotherState,oneMoreState;
        |}
        |
        |.root .momo {
        |    color: goldenrod;
        |}
        `;
            const topFileName = 'top.st.css';
            const importFileName = 'import.st.css';
            const fileSystem = createMemoryFs({
                [topFileName]: topFileText,
                [importFileName]: importFileText
            });
            const topTextDocument = TextDocumentItem.create(
                URI.file('/' + topFileName).toString(),
                'stylable',
                0,
                topFileText
            );
            const importTextDocument = TextDocumentItem.create(
                URI.file('/' + importFileName).toString(),
                'stylable',
                0,
                importFileText
            );
            const topFileLocations = [
                { line: 2, character: 17 },
                { line: 6, character: 18 },
                { line: 9, character: 7 }
            ];
            const importFileLocations = [{ line: 4, character: 3 }, { line: 8, character: 10 }];

            const stylableLSP = new StylableLanguageService({
                fs: fileSystem,
                requireModule: require,
                rootPath: '/',
                textDocuments: new TextDocuments()
            });
            connect(
                stylableLSP,
                testCon.server
            );

            topFileLocations.forEach(async loc => {
                const def = await testCon.client.definition({
                    position: loc,
                    textDocument: topTextDocument
                });
                expect(def).to.eql([
                    {
                        uri: importTextDocument.uri,
                        range: createRange(4, 1, 4, 5)
                    }
                ]);
            });
            importFileLocations.forEach(async loc => {
                const def = await testCon.client.definition({
                    position: loc,
                    textDocument: importTextDocument
                });
                expect(def).to.eql([
                    {
                        uri: importTextDocument.uri,
                        range: createRange(4, 1, 4, 5)
                    }
                ]);
            });
        })
    );
});
