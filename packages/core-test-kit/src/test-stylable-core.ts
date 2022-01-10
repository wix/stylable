import { testInlineExpects } from './inline-expectation';
import { Stylable, StylableExports, StylableMeta } from '@stylable/core';
import { createMemoryFs } from '@file-services/memory';

export function testStylableCore(input: string) {
    // infra
    const fs = createMemoryFs({ '/entry.st.css': input });
    const stylable = Stylable.create({
        fileSystem: fs,
        projectRoot: '/',
        resolveNamespace: (ns) => ns,
    });

    // transform entries
    const sheets: Record<string, { meta: StylableMeta; exports: StylableExports }> = {};
    const path = '/entry.st.css';
    const meta = stylable.process(path);
    const { exports } = stylable.transform(meta);
    sheets[path] = { meta, exports };

    // inline test
    testInlineExpects({ meta });

    // expose infra and entry sheets
    return { sheets, stylable, fs };
}
