import { expect } from 'chai';
import { nodeFs as fs } from '@file-services/node';
import nodeEval from 'node-eval';
import stylableTransformer from '@stylable/jest';
import type { RuntimeStylesheet } from '@stylable/runtime';
import { dirname, join } from 'path';
import { createDefaultResolver } from '@stylable/core';

describe('jest process', () => {
    it('should process stylable sources using createTransformer API', () => {
        const filename = require.resolve('@stylable/jest/test/fixtures/test.st.css');
        const content = fs.readFileSync(filename, 'utf8');
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
        const content = fs.readFileSync(filename, 'utf8');
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
        const content = fs.readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer({
            stylable: { resolveNamespace: (ns, _srcPath) => `${ns}-custom` },
            configPath: join(dirname(filename), 'stylable.config.js'),
        });

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`index-custom__root wp-a-custom__test`);
    });

    it('should use inline resolver over default config one', () => {
        const filename = require.resolve(
            '@stylable/jest/test/fixtures/default-config/index.st.css'
        );
        const content = fs.readFileSync(filename, 'utf8');
        const transformer = stylableTransformer.createTransformer({
            stylable: {
                resolveNamespace: (ns, _srcPath) => `${ns}-custom`,
                resolveModule: createDefaultResolver({
                    fs,
                    alias: {
                        'wp-alias/*': join(dirname(filename), 'webpack-alias2') + '/*',
                    },
                }),
            },
            configPath: join(dirname(filename), 'stylable.config.js'),
        });

        const module = nodeEval(
            transformer.process(content, filename).code,
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`index-custom__root wp-b-custom__test`);
    });

    it('should emit diagnostics when not able to load stylable config file', () => {
        const filename = require.resolve(
            '@stylable/jest/test/fixtures/default-config/index.st.css'
        );
        const content = fs.readFileSync(filename, 'utf8');
        let foundError = false;

        try {
            const transformer = stylableTransformer.createTransformer({
                configPath: join(dirname(filename), 'MISSING'),
            });

            nodeEval(transformer.process(content, filename).code, filename) as RuntimeStylesheet;
        } catch (error: any) {
            if (error.message.includes('Failed to load Stylable config')) {
                foundError = true;
            }
        }

        expect(foundError, 'expected to be unable to load config file').to.equal(true);
    });
});
