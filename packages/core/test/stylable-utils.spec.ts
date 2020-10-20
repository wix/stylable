import {generateInfra} from '@stylable/core-test-kit';
import {expect} from 'chai';
import {generateScopedVar} from '@stylable/core';

describe('stylable utils', () => {
    describe('generate', () => {
        it('should resolve classes', () => {
            const { resolver, fileProcessor } = generateInfra({
                files: {
                    '/entry.st.css': {
                        content: ``,
                    },
                },
            });

            const entryMeta = fileProcessor.process('/entry.st.css');
            expect(generateScopedVar(resolver, entryMeta, '--someVar')).to.equal('--entry1466596548-someVar');
        });
    });
})
