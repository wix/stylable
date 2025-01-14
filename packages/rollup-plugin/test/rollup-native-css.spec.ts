import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner.js';
import { getProjectPath } from './test-kit/test-helpers.js';
import { createDefaultResolver } from '@stylable/core';
import { nodeFs as fs } from '@file-services/node';

describe('StylableRollupPlugin - import native CSS', function () {
    this.timeout(30000);

    const project = 'native-css';

    const resolve = createDefaultResolver({ fs });
    const runner = rollupRunner({
        projectPath: getProjectPath(project),
        entry: './src/index.js',
        pluginOptions: {
            stylableConfig(config) {
                config.mode = 'development';
                // keep namespace with no hash for test expectations
                config.resolveNamespace = (namespace) => namespace;
                // set custom resolve for test
                config.resolveModule = (path, request) => {
                    if (request === './resolve-me') {
                        return resolve(path, './custom-resolved.css');
                    }
                    return resolve(path, request);
                };
                return config;
            },
        },
    });

    it('should include native CSS imports', async () => {
        const { serve, ready, open } = runner;

        await ready;

        const url = await serve();
        const page = await open(url, {
            // headless: false,
        });

        const {
            localSideEffect,
            libSideEffect,
            libClass,
            localColor,
            libColor,
            customResolveColor,
            customResolveSideEffect,
        } = await page.evaluate(() => {
            const computedStyle = getComputedStyle((window as any).document.body);
            return {
                localSideEffect: computedStyle.getPropertyValue('--local-side-effect'),
                libSideEffect: computedStyle.getPropertyValue('--lib-side-effect'),
                libClass: computedStyle.getPropertyValue('--lib-class'),
                localColor: computedStyle.backgroundColor,
                libColor: computedStyle.color,
                customResolveColor: computedStyle.borderColor,
                customResolveSideEffect: computedStyle.getPropertyValue(
                    '--custom-resolved-side-effect',
                ),
            };
        });
        expect(localSideEffect, 'local side effect').to.eql('from local side-effect');
        expect(libSideEffect, 'lib side effect').to.eql('from lib side-effect');
        expect(customResolveSideEffect, 'custom resolve side effect').to.eql(
            'from custom resolved side-effect',
        );
        expect(libClass, 'lib class').to.eql('from lib class');
        expect(localColor, 'local import prop').to.eql('rgb(0, 128, 0)');
        expect(libColor, 'lib import prop').to.eql('rgb(0, 100, 0)');
        expect(customResolveColor, 'custom resolve import prop').to.eql('rgb(128, 0, 128)');
    });
});
