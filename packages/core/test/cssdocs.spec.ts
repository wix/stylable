import { generateStylableResult } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { getCssDocsForSymbol } from '../src';

describe('cssDocs comments metadata', () => {
    it('should return null when extracting cssDocs from a simple selector without a definition', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        .root {}
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.root);

        expect(cssDoc).to.eql(null);
    });

    it('should parse a simple class description', () => {
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
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.root);

        expect(cssDoc).to.eql({ description: 'this is my description', tags: {} });
    });

    it('should parse a multiple tags, including multi-line for a simple class', () => {
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
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.root);

        expect(cssDoc).to.eql({
            description: '',
            tags: {
                description: 'this is a description tag',
                field1: 'data field 1',
                field2: 'data field 2 is a multi line input',
                field3: 'data field 3',
            },
        });
    });

    it('should parse a simple description and tag for a simple class', () => {
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
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.root);

        expect(cssDoc).to.eql({
            description: 'this is a description text',
            tags: { description: 'this is a description tag' },
        });
    });

    it('should parse a simple description and tag for a simple element', () => {
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
                        Part {}
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.Part);

        expect(cssDoc).to.eql({
            description: 'this is a description text',
            tags: { description: 'this is a description tag' },
        });
    });

    it('should parse a simple var description', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            /**
                             * this is a var description text
                             */
                            myVar: some value;
                        }
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.myVar);

        expect(cssDoc).to.eql({
            description: 'this is a var description text',
            tags: {},
        });
    });

    it('should parse a simple var description and tags', () => {
        const { meta } = generateStylableResult({
            entry: `/entry.st.css`,
            files: {
                '/entry.st.css': {
                    namespace: 'entry',
                    content: `
                        :vars {
                            /**
                             * this is a var description text
                             * @field1 data field 1
                             * @field2 data field 2 is a multi
                             * line input
                             */
                            myVar: some value;
                        }
                        `,
                },
            },
        });

        const cssDoc = getCssDocsForSymbol(meta, meta.mappedSymbols.myVar);

        expect(cssDoc).to.eql({
            description: 'this is a var description text',
            tags: {
                field1: 'data field 1',
                field2: 'data field 2 is a multi line input',
            },
        });
    });
});
