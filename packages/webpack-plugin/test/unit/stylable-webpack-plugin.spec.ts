import {expect} from 'chai';
import StylableWebpackPlugin from '../../src';
import { StylableWebpackPluginOptions } from '../../src/types';

describe('StylableWebpackPlugin Unit', () => {
    it('should try load local stylable.config and run options hook', () => {
        class Test extends StylableWebpackPlugin {
            public loadLocalStylableConfig(context: string) {
                expect(context, 'lookup context').to.equal('.');
                return {
                    options(options: any) {
                        expect(options.test, 'top level option').to.equal(true);
                        return {...options, fromConfig: true};
                    }
                };
            }
        }
        const plugin = new Test({test: true} as any);
        plugin.normalizeOptions();
        plugin.overrideOptionsWithLocalConfig('.');

        expect((plugin.options as any).fromConfig, 'from local config').to.equal(true);
    });
    it('should have default options for production mode', () => {
        const plugin = new StylableWebpackPlugin();
        plugin.normalizeOptions('production');
        expect(plugin.options).to.deep.include({
            outputCSS: true,
            includeCSSInJS: false,
            optimize: {
                removeComments: true,
                shortNamespaces: true,
                classNameOptimizations: true,
                removeStylableDirectives: true,
                removeUnusedComponents: true,
                removeEmptyNodes: true,
                minify: true
            }
        });
    });
    it('user options are stronger then default production mode', () => {
        const plugin = new StylableWebpackPlugin({
            outputCSS: false,
            optimize: {
                removeComments: false
            }
        });
        plugin.normalizeOptions('production');
        expect(plugin.options).to.deep.include({
            outputCSS: false,
            includeCSSInJS: false,
            optimize: {
                removeComments: false,
                shortNamespaces: true,
                classNameOptimizations: true,
                removeStylableDirectives: true,
                removeUnusedComponents: true,
                removeEmptyNodes: true,
                minify: true
            }
        });
    });
});
