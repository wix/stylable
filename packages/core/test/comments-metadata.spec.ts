import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { getCssDocsForSymbol } from '../src';

describe('css docs comments metadata', () => {
    it('should return null when extracting cssdocs from a meta without no definitions', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .root {}
                        `
                }
            }
        });

        const cssDoc = getCssDocsForSymbol(meta.mappedSymbols.root);

        expect(cssDoc).to.eql(null);
    });

    it('should parse a simple description', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        /**
                         * this is my description
                         */
                        .root {}
                        `
                }
            }
        });

        const cssDoc = getCssDocsForSymbol(meta.mappedSymbols.root);

        expect(cssDoc).to.eql({ description: 'this is my description', tags: {} });
    });

    it('should parse a multiple tags, including multi-line', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        /**
                         * @description this is a description tag
                         * @field1 data field 1
                         * @field2 data field 2 is a multi
                         * line input
                         * @field3 data field 3
                         */
                        .root {}
                        `
                }
            }
        });

        const cssDoc = getCssDocsForSymbol(meta.mappedSymbols.root);

        expect(cssDoc).to.eql({
            description: '',
            tags: {
                description: 'this is a description tag',
                field1: 'data field 1',
                field2: 'data field 2 is a multi line input',
                field3: 'data field 3'
            }
        });
    });

    it('should parse a simple description and tag', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        /**
                         * this is a description text
                         * @description this is a description tag
                         */
                        .root {}
                        `
                }
            }
        });

        const cssDoc = getCssDocsForSymbol(meta.mappedSymbols.root);

        expect(cssDoc).to.eql({
            description: 'this is a description text',
            tags: { description: 'this is a description tag' }
        });
    });
});
