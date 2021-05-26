import { generateStylableRoot, testInlineExpects } from '@stylable/core-test-kit';

describe('native nested pseudo classes', () => {
    for (const name of ['is', 'has', 'where']) {
        it(`should transform inside :${name}`, () => {
            const result = generateStylableRoot({
                entry: `/style.st.css`,
                files: {
                    '/style.st.css': {
                        namespace: 'ns',
                        content: `
                            /* @check :${name}(.ns__x, .ns__y) */
                            :${name}(.x, .y) {}
                        `,
                    },
                },
            });

            testInlineExpects(result);
        });
    }
});
