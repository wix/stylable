import { expect } from 'chai';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { attachHook } from '@stylable/node';

const fixturesPath = dirname(
    require.resolve('@stylable/node/test/fixtures/default-config/package.json')
);

describe('require hook', () => {
    afterEach(() => {
        delete require.extensions['.css'];
        for (const itemName of readdirSync(fixturesPath)) {
            delete require.cache[join(fixturesPath, itemName)];
        }
    });

    it('should work on .st.css', () => {
        attachHook({ configPath: join(fixturesPath, 'stylable.config.js') });
        const indexModule = require(join(fixturesPath, 'index.st.css'));
        const mappedModule = require(join(fixturesPath, 'webpack-alias/green.st.css'));

        // this checks that a mapped module was correctly resolved using -st-extends
        expect(indexModule.classes.root).to.equal(
            indexModule.namespace + '__root' + ' ' + mappedModule.namespace + '__test'
        );
    });
});
