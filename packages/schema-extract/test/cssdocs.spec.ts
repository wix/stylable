import { expect } from 'chai';
import path from 'path';
import { extractSchema, stylableClass, stylableModule, StylableModuleSchema } from '../src';
import { mockNamespace } from './mock-namespace';

describe('cssDocs extraction', () => {
    it('should extract cssDocs description and tags', () => {
        const res = extractSchema(`
            /**
             * this is a description text
             * @description this is a description tag
             */
            .root{}
            `, '/entry.st.css', '/', path, mockNamespace);

        const expected: StylableModuleSchema = {
            $id: '/entry.st.css',
            $ref: stylableModule,
            namespace: 'entry',
            properties: {
                root: {
                    $ref: stylableClass,
                    description: 'this is a description text',
                    tags: {
                        description: 'this is a description tag'
                    }
                }
            }
        };
        expect(res).to.eql(expected);
    });
});