import { expect } from 'chai';
import { readdirSync } from 'fs';
import { murmurhash3_32_gc } from '@stylable/core';
import { join } from 'path';
import { attachHook } from '@stylable/node';

describe('require hook', () => {
    afterEach(() => {
        delete require.extensions['.css'];
        readdirSync(join(__dirname, 'fixtures')).forEach((name) => {
            delete require.cache[join(__dirname, 'fixtures', name)];
        });
    });

    it('should work on .st.css', () => {
        attachHook();
        const m = require('./fixtures/test.st.css');
        expect(m.classes.root).to.equal(m.namespace + '__root');
        expect(m.classes.test).to.equal(m.namespace + '__test');
    });

    it('should only catch .st.css files by default', () => {
        expect(() => {
            require('./fixtures/plain.css');
        }).to.throw('Unexpected token');
    });

    it('should preserve previous css extension', () => {
        require.extensions['.css'] = (m, filename) => {
            return (m as any)._compile(`module.exports = ".test{}"`, filename);
        };
        attachHook();
        const m = require('./fixtures/plain.css');
        expect(m).to.equal('.test{}');
    });

    it('should not work by default', () => {
        expect(() => {
            require('./fixtures/test.st.css');
        }).to.throw('Unexpected token');
    });

    it('should generate namespaces with resolveNamespace relative to package root, name, version', () => {
        attachHook();
        const fileName = 'test';
        const relativePathFromRoot = 'test.st.css';
        const { name, version } = require('./fixtures/package.json');
        const expectedNamespace =
            fileName + murmurhash3_32_gc(name + '@' + version + '/' + relativePathFromRoot);
        const m = require('./fixtures/test.st.css');
        expect(m.namespace).to.equal(expectedNamespace);
    });

    it('should prefer *.st.css.js over st.css', () => {
        attachHook();
        const m = require('./fixtures/has-js.st.css');
        expect(m.test).to.equal(true);
    });

    it('should ignoreJSModules', () => {
        attachHook({ ignoreJSModules: true });
        const m = require('./fixtures/has-js.st.css');
        expect(m.$id).to.contain('has-js.st.css');
    });
});
