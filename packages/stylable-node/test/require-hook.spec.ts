import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { attachHook } from '../src';

describe('require hook', () => {
    afterEach(() => {
        delete require.extensions['.css'];
        fs.readdirSync(path.join(__dirname, 'fixtures')).forEach(name => {
            delete require.cache[path.join(__dirname, 'fixtures', name)];
        });
    });

    it('should work on .st.css', () => {
        attachHook();
        const m = require('./fixtures/test.st.css');
        expect(m.root).to.equal(m.$namespace + '--root');
        expect(m.test).to.equal(m.$namespace + '--test');
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
});
