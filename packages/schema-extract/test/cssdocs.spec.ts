import { expect } from 'chai';
import path from 'path';
import {
    extractSchema,
    stylableClass,
    stylableElement,
    stylableModule,
    StylableModuleSchema,
    stylableVar
} from '../src';
import { mockNamespace } from './mock-namespace';

describe('cssDocs extraction', () => {
    it('should extract cssDocs description and tags for a simple class', () => {
        const res = extractSchema(
            `
            /**
             * this is a description text
             * @description this is a description tag
             */
            .root {}
            `,
            '/entry.st.css',
            '/',
            path,
            mockNamespace
        );

        const expected: StylableModuleSchema = {
            $id: '/entry.st.css',
            $ref: stylableModule,
            namespace: 'entry',
            properties: {
                root: {
                    $ref: stylableClass,
                    description: 'this is a description text',
                    docTags: {
                        description: 'this is a description tag'
                    }
                }
            }
        };
        expect(res).to.eql(expected);
    });

    it('should extract cssDocs description and tags for a simple element', () => {
        const res = extractSchema(
            `
            /**
             * this is a description text
             * @description this is a description tag
             */
            Comp {}
            `,
            '/entry.st.css',
            '/',
            path,
            mockNamespace
        );

        const expected: StylableModuleSchema = {
            $id: '/entry.st.css',
            $ref: stylableModule,
            namespace: 'entry',
            properties: {
                root: {
                    $ref: stylableClass
                },
                Comp: {
                    $ref: stylableElement,
                    description: 'this is a description text',
                    docTags: {
                        description: 'this is a description tag'
                    }
                }
            }
        };
        expect(res).to.eql(expected);
    });

    it('should extract cssDocs description and tags for a variable', () => {
        const res = extractSchema(
            `
            :vars {
                /**
                 * this is a var description text
                 * @description this is a var description tag
                 */
                myVar: some value;
            }
            `,
            '/entry.st.css',
            '/',
            path,
            mockNamespace
        );

        const expected: StylableModuleSchema = {
            $id: '/entry.st.css',
            $ref: stylableModule,
            namespace: 'entry',
            properties: {
                root: {
                    $ref: stylableClass
                },
                myVar: {
                    $ref: stylableVar,
                    description: 'this is a var description text',
                    docTags: {
                        description: 'this is a var description tag'
                    }
                }
            }
        };
        expect(res).to.eql(expected);
    });
});
