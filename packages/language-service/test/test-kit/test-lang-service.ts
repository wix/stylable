import { createMemoryFs } from '@file-services/memory';
import type { IDirectoryContents, IFileSystem } from '@file-services/types';
import { Stylable, StylableConfig } from '@stylable/core';
import { deindent, copyDirectory } from '@stylable/core-test-kit';
import { StylableLanguageService } from '@stylable/language-service';
import { range } from '@stylable/language-service/dist/lib/completion-types';
import { CompletionItem, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-css-languageservice';
import { URI } from 'vscode-uri';
import { expect } from 'chai';
import fs from '@file-services/node';

export interface TestOptions {
    testOnNativeFileSystem: string;
    stylableConfig: TestStylableConfig;
}
export type TestStylableConfig = Omit<
    StylableConfig,
    'fileSystem' | `projectRoot` | `resolveNamespace`
> & {
    filesystem?: IFileSystem;
    projectRoot?: StylableConfig['projectRoot'];
    resolveNamespace?: StylableConfig['resolveNamespace'];
};

export function testLangService(
    input: string | IDirectoryContents,
    options: Partial<TestOptions> = {},
) {
    // infra
    const fs = setupFileSystem(input, options);

    const stylable = new Stylable({
        fileSystem: fs,
        projectRoot: '/',
        resolveNamespace: (ns) => ns,
        requireModule: createJavascriptRequireModule(fs),
        ...(options.stylableConfig || {}),
    });

    // collect cursor positions
    const carets: Record<string, Record<string | number, number>> = {};
    const allSheets = fs.findFilesSync(stylable.projectRoot, {
        filterFile: ({ path }) => path.endsWith(`.st.css`),
    });
    for (const path of allSheets) {
        let source = deindent(fs.readFileSync(path, { encoding: 'utf-8' }));
        const posComments = source.match(/\^([^^]*)\^/g);
        if (posComments) {
            const sheetPositions: Record<string | number, number> = {};
            let unNamedCounter = 0;
            for (const comment of posComments) {
                const offset = source.indexOf(comment);
                source = source.slice(0, offset) + source.slice(offset + comment.length);
                const positionName =
                    comment.length > 2
                        ? comment.substring(1, comment.length - 1).trim()
                        : unNamedCounter++;
                if (sheetPositions[positionName] !== undefined) {
                    throw new Error(`debug position "${positionName}" override in ${path}`);
                }
                sheetPositions[positionName] = offset;
            }
            carets[path] = sheetPositions;
        }
        fs.writeFileSync(path, source);
    }

    const service = new StylableLanguageService({ fs, stylable });
    const api = {
        fs,
        stylable,
        service,
        carets,
        assertCompletions: (...args: AssertArgs) => {
            assertCompletions(api, args);
        },
        completion<T>(
            data: T[],
            template: (value: T) => Partial<CompletionItem>,
        ): Partial<CompletionItem>[] {
            return data.map(template);
        },
        textEditContext(filePath: string) {
            const document = TextDocument.create(
                URI.file(filePath).toString(),
                'stylable',
                1,
                fs.readFileSync(filePath, { encoding: 'utf-8' }),
            );
            return {
                replaceText: createReplaceText(document),
            };
        },
    };
    return api;
}
function createReplaceText(document: TextDocument) {
    return function replaceText(
        offset: number,
        text: string,
        replaceOffsets?: Parameters<typeof range>[1],
    ) {
        const position = document.positionAt(offset);
        return TextEdit.replace(range(position, replaceOffsets), text);
    };
}

type TestKitApi = ReturnType<typeof testLangService>;

function setupFileSystem(input: string | IDirectoryContents, options: Partial<TestOptions>) {
    const content = typeof input === `string` ? { '/entry.st.css': input } : input;
    if (options.testOnNativeFileSystem) {
        options.stylableConfig ||= {};
        options.stylableConfig.filesystem = fs;
        options.stylableConfig.projectRoot = options.testOnNativeFileSystem;
        copyDirectory(fs, options.testOnNativeFileSystem, content);
        return fs;
    } else {
        return createMemoryFs(content);
    }
}

interface AssertCompletionsConfig {
    actualList: CompletionItem[];
    expectedList?: Array<Partial<CompletionItem>>;
    unexpectedList?: Array<Partial<CompletionItem>>;
    message?: string;
}
type AssertArgs =
    | [config: AssertCompletionsConfig]
    | [
          filePath: string,
          config: (context: {
              filePath: string;
              carets: Record<string | number, number>;
              textEdit: {
                  replaceText: ReturnType<typeof createReplaceText>;
              };
          }) => AssertCompletionsConfig,
      ];

export function assertCompletions(
    api: Pick<TestKitApi, 'carets' | 'textEditContext'>,
    [configOrPath, generateConfig]: AssertArgs,
) {
    const {
        actualList,
        expectedList = [],
        unexpectedList = [],
        message = '',
    } = typeof configOrPath === 'string'
        ? generateConfig!({
              filePath: configOrPath,
              carets: api.carets[configOrPath],
              textEdit: api.textEditContext(configOrPath),
          })
        : configOrPath;

    const messagePrefix = message ? `(${message}) ` : '';
    for (const expected of expectedList) {
        const actual = actualList.find(({ label }) => label === expected.label);
        if (!actual) {
            throw new Error(
                `${messagePrefix}expected to find completion with label "${expected.label}"`,
            );
        }
        for (const [expectedField, expectedValue] of Object.entries(expected) as [
            [keyof CompletionItem, any],
        ]) {
            const expectLabel = `${messagePrefix}expected "${expected.label}" completions to have ${expectedField}`;
            expect(actual[expectedField], expectLabel).to.eql(expectedValue);
        }
    }
    for (const expected of unexpectedList) {
        const actual = actualList.find(({ label }) => label === expected.label);
        if (actual) {
            throw new Error(
                `${messagePrefix}expected NOT to find completion with label "${expected.label}"`,
            );
        }
    }
}

export function createJavascriptRequireModule(fs: IFileSystem) {
    const requireModule = (id: string): any => {
        if (id === '@stylable/core') {
            return require(id);
        }

        const _module = {
            id,
            exports: {},
        };
        try {
            if (!id.match(/\.js$/)) {
                id += '.js';
            }
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const fn = new Function(
                'module',
                'exports',
                'require',
                fs.readFileSync(id, { encoding: 'utf8', flag: 'r' }),
            );
            fn(_module, _module.exports, requireModule);
        } catch {
            throw new Error('Cannot require file: ' + id);
        }
        return _module.exports;
    };
    return requireModule;
}
