import { RuleTester } from '@typescript-eslint/rule-tester';
import StylableLint from 'eslint-plugin-stylable/rule';
import { fileURLToPath } from 'node:url';

// mock afterAll for RuleTester (should be fixed in next version)
(globalThis as any).afterAll = (globalThis as any).after;

const filename = fileURLToPath(new URL('../../test/stylesheet-user.ts', import.meta.url));

const tester = new RuleTester();

tester.run('basic unknown locals discovery', StylableLint, {
    invalid: [
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; const a = XYZ.part",
            errors: [{ messageId: 'unknown-local' }],
        },
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; const a = XYZ['part']",
            errors: [{ messageId: 'unknown-local' }],
        },
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; ()=> {const a = XYZ.part}",
            errors: [{ messageId: 'unknown-local' }],
        },
        {
            filename,
            code: "import {keyframes as XYZ} from './stylesheet.st.css'; const a = XYZ.part",
            errors: [{ messageId: 'unknown-local' }],
        },
        {
            filename,
            code: "import {vars as XYZ} from './stylesheet.st.css'; const a = XYZ.part",
            errors: [{ messageId: 'unknown-local' }],
        },
        {
            filename,
            code: "import {stVars as XYZ} from './stylesheet.st.css'; const a = XYZ.part",
            errors: [{ messageId: 'unknown-local' }],
        },
    ],
    valid: [
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; const a = XYZ.root",
        },
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; (XYZ)=> {const a = XYZ.part}",
        },
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; const a = XYZ['root']",
        },
        {
            filename,
            code: "import {classes as XYZ} from './stylesheet.st.css'; const x = ''; const a = XYZ[x]",
        },
        {
            filename,
            code: "import {keyframes as XYZ} from './stylesheet.st.css'; const a = XYZ.test",
        },
        {
            filename,
            code: "import {vars as XYZ} from './stylesheet.st.css'; const a = XYZ.cssVar",
        },
        {
            filename,
            code: "import {stVars as XYZ} from './stylesheet.st.css'; const a = XYZ.key",
        },
    ],
});
