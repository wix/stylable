import { testInlineExpects } from './inline-expectation';
import { Stylable, StylableConfig, StylableResults } from '@stylable/core';
import { createMemoryFs } from '@file-services/memory';
import type { IDirectoryContents, IFileSystem } from '@file-services/types';
import { isAbsolute } from 'path';

export interface TestOptions {
    entries: string[];
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

/**
 * The test function takes in a single '/entry.st.css' stylesheet string
 * or a directory structure and then runs 2 phases
 * 1. build stylesheets from entries in a configurable order
 * 2. run inline test on all '.st.css' files found
 * @param input single '/entry.st.css' string or file system structure
 */
export function testStylableCore(
    input: string | IDirectoryContents,
    options: Partial<TestOptions> = {}
) {
    // infra
    const fs =
        options.stylableConfig?.filesystem ||
        createMemoryFs(typeof input === `string` ? { '/entry.st.css': input } : input);
    const stylable = Stylable.create({
        fileSystem: fs,
        projectRoot: '/',
        resolveNamespace: (ns) => ns,
        ...(options.stylableConfig || {}),
    });

    // collect sheets
    const allSheets = fs.findFilesSync(`/`, { filterFile: ({ path }) => path.endsWith(`.st.css`) });
    const entries = options.entries || allSheets;

    // transform entries - run build in requested order
    const sheets: Record<string, StylableResults> = {};
    for (const path of entries) {
        if (!isAbsolute(path || '')) {
            throw new Error(testStylableCore.errors.absoluteEntry(path));
        }
        const meta = stylable.process(path);
        const { exports } = stylable.transform(meta);
        sheets[path] = { meta, exports };
    }

    // inline test - build all and test
    for (const path of allSheets) {
        const meta = stylable.process(path);
        if (!meta.outputAst) {
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
