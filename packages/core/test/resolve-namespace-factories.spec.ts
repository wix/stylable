import { expect } from 'chai';
import { noCollisionNamespace } from '../src/resolve-namespace-factories';

describe('No collision namespace resolver', () => {
    const nsResolver = noCollisionNamespace({ prefix: 'MyApp_' });

    it('creates valid namespaces', () => {
        const ns1 = nsResolver('Button', '/a/b/c');
        const ns2 = nsResolver('Input', '/a/b/d');

        expect(ns1).to.equal('MyApp_Button');
        expect(ns2).to.equal('MyApp_Input');
    });

    it('throw an error when encountering a duplicate namespace', () => {
        let error = '';

        try {
            nsResolver('Button', '/a/b/c');
            nsResolver('Button', '/a/b/fail');
        } catch (e) {
            error = e.message;
        }

        expect(error).to.equal('namespace (MyApp_Button of /a/b/fail) is already in use');
    });
});
