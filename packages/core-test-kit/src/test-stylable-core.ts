import { testInlineExpects } from './inline-expectation.js';
import { Stylable, StylableConfig, StylableResults } from '@stylable/core';
import { createMemoryFs } from '@file-services/memory';
import type { IDirectoryContents, IFileSystem } from '@file-services/types';
import { isAbsolute } from 'path';

export interface TestOptions {
    entries: `/${string}`[];
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

type AddLeadingSlash<T extends string> = T extends `/${infer U}` ? `/${U}` : `/${T}`;
type RemoveRelative<T extends string> = T extends `./${infer U}` ? U : T;

/**
 * The test function takes in a single '/entry.st.css' stylesheet string
 * or a directory structure and then runs 2 phases
 * 1. build stylesheets from entries in a configurable order
 * 2. run inline test on all '.st.css' files found
 * @param input single '/entry.st.css' string or file system structure
 */
export function testStylableCore<
    const T extends string | IDirectoryContents,
    const O extends Partial<TestOptions>,
>(input: T, options: O = {} as O) {
    // infra
    const fs =
        options.stylableConfig?.filesystem ||
        createMemoryFs(typeof input === `string` ? { '/entry.st.css': input } : input);
    const stylable = new Stylable({
        fileSystem: fs,
        projectRoot: '/',
        resolveNamespace: (ns) => ns,
        requireModule: createJavascriptRequireModule(fs),
        ...(options.stylableConfig || {}),
    });

    // collect sheets
    const allSheets = fs.findFilesSync(`/`, { filterFile: ({ path }) => path.endsWith(`.st.css`) });
    const entries = options.entries || allSheets;

    // transform entries - run build in requested order
    type Entries = O['entries'] extends string[] ? O['entries'][number] : string;
    type HasExternalFS = O['stylableConfig'] extends { filesystem: IFileSystem } ? true : false;
    type InputFsKeys = T extends string ? '/entry.st.css' : keyof T;
    type Keys = HasExternalFS extends true ? string : InputFsKeys;
    type Sheets = Record<AddLeadingSlash<RemoveRelative<Keys & Entries>>, StylableResults>;
    const sheets = {} as Sheets;
    for (const path of entries) {
        if (!isAbsolute(path || '')) {
            throw new Error(testStylableCore.errors.absoluteEntry(path));
        }
        const meta = stylable.analyze(path);
        const { exports } = stylable.transform(meta);
        sheets[path as keyof Sheets] = { meta, exports };
    }

    // inline test - build all and test
    for (const path of allSheets) {
        const meta = stylable.analyze(path);
        if (!meta.targetAst) {
            // ToDo: test
            stylable.transform(meta);
        }
        testInlineExpects({ meta });
    }

    // expose infra and entry sheets
    return { sheets, stylable, fs };
}
testStylableCore.errors = {
    absoluteEntry: (entry: string) => `entry must be absolute path got: ${entry}`,
};

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
