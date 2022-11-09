import { expect } from 'chai';
import fs, { readFileSync } from 'fs';
import nodeEval from 'node-eval';
import stylableTransformer from '@stylable/jest';
import type { RuntimeStylesheet } from '@stylable/runtime';
import { dirname, join } from 'path';
import { createDefaultResolver } from '@stylable/core';

describe('jest process', () => {
    it('should process stylable sources using createTransformer API', () => {
        const filename = require.resolve('@stylable/jest/test/fixtures/test.st.css');
        const content = readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer();

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`${module.namespace}__root`);
        expect(module.classes.test).to.equal(`${module.namespace}__test`);
    });

    it('should process stylable sources with a custom namespace resolver', () => {
        const filename = require.resolve('@stylable/jest/test/fixtures/test.st.css');
        const content = readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer({
            stylable: { resolveNamespace: (ns, _srcPath) => `${ns}-custom` },
        });

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`test-custom__root`);
        expect(module.classes.test).to.equal(`test-custom__test`);
    });

    it('should resolve default config from stylable.config.js and use the provided resolver', () => {
        const filename = require.resolve(
            '@stylable/jest/test/fixtures/default-config/index.st.css'
        );
        const content = readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer({
            stylable: { resolveNamespace: (ns, _srcPath) => `${ns}-custom` },
            configPath: join(dirname(filename), 'stylable.config.js'),
        });

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`index-custom__root green-custom__test`);
    });

    it('should use inline resolver over default config one', () => {
        const filename = require.resolve(
            '@stylable/jest/test/fixtures/default-config/index.st.css'
        );
        const content = readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer({
            stylable: {
                resolveNamespace: (ns, _srcPath) => `${ns}-custom`,
                resolveModule: createDefaultResolver(fs, {
                    alias: {
                        'wp-alias': join(dirname(filename), 'webpack-alias'),
                    },
                }),
            },
            configPath: join(dirname(filename), 'stylable.config.js'),
        });

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.override).to.equal(
            `index-custom__override override-custom__overrideTest`
        );
    });
});
