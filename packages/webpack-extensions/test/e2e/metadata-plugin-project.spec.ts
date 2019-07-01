import { createMemoryFs } from '@file-services/memory';
import { createWebpackFs } from '@file-services/webpack';
import {
    StylableMetadataPlugin,
    StylableMetadataPluginOptions
} from '@stylable/webpack-extensions';
import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { expect } from 'chai';
import { basename, join } from 'path';
import webpack from 'webpack';

const projectName = 'metadata-plugin-project';
const projectPath = join(__dirname, 'projects', projectName);

async function bundleUsingWebpack(mode?: StylableMetadataPluginOptions['mode']) {
    const compiler = webpack({
        mode: 'development',
        context: projectPath,
        plugins: [
            new StylableWebpackPlugin({
                optimize: {
                    shortNamespaces: true
                }
            }),
            new StylableMetadataPlugin({
                name: 'test',
                version: '1.0.0',
                renderSnapshot(_exp, res) {
                    return `<snapshot>${basename(res.resource)}</snapshot>`;
                },
                mode
            })
        ]
    });
    compiler.outputFileSystem = createWebpackFs(createMemoryFs());
    return new Promise<webpack.Stats>((res, rej) =>
        compiler.run((e, stats) => (e ? rej(e) : res(stats)))
    );
}

describe(`(${projectName})`, () => {
    const expectedMetadata = {
        version: '1.0.0',
        name: 'test',
        fs: {
            '/test/src/index.st.css': {
                metadata: {
                    namespace: 'o0',
                    depth: 4
                },
                content: null
            },
            '/test/src/variants/v.st.css': {
                metadata: {
                    namespace: 'v-o0',
                    variant: true,
                    depth: 4
                },
                content: null
            },
            '/test/node_modules/test-components/index.st.css': {
                metadata: {
                    namespace: 'o1',
                    depth: 3
                },
                content: null
            },
            '/test/node_modules/test-components/button.st.css': {
                metadata: {
                    namespace: 'o2',
                    depth: 1
                },
                content: null
            },
            '/test/node_modules/test-components/gallery.st.css': {
                metadata: {
                    namespace: 'o3',
                    depth: 2
                },
                content: null
            },
            '/test/index.st.css': {
                metadata: {
                    namespace: 'test-index',
                    depth: 4
                },
                content: null
            }
        },
        components: {
            Index: {
                id: 'Index',
                variantsPath: '/test/src/variants',
                namespace: 'o0',
                stylesheetPath: '/test/src/index.st.css',
                snapshots: ['<snapshot>index.js</snapshot>']
            }
        },
        packages: {
            test: '/test',
            ['test-components']: '/test/node_modules/test-components'
        }
    };

    describe('snapshotting', () => {
        it('contains metadata', async () => {
            const { compilation } = await bundleUsingWebpack();
            const rawSource = compilation.assets['test.metadata.json'];

            expect(rawSource).to.be.an('object');
            expect(nullifyContentField(JSON.parse(rawSource.source()))).to.eql(expectedMetadata);
        });
    });

    describe('cjs mode', () => {
        it('contains metadata as cjs export', async () => {
            const { compilation } = await bundleUsingWebpack('cjs');
            const rawSource = compilation.assets['test.metadata.json.js'];

            expect(rawSource).to.be.an('object');
            expect(nullifyContentField(evalAssetModule(rawSource.source()))).to.eql(
                expectedMetadata
            );
        });
    });

    describe('amd static mode', () => {
        it('contains metadata as static amd export', async () => {
            const { compilation } = await bundleUsingWebpack('amd:static');
            const rawSource = compilation.assets['test.metadata.json.js'];

            expect(rawSource).to.be.an('object');
            expect(nullifyContentField(evalAssetModule(rawSource.source()))).to.eql(
                expectedMetadata
            );
        });
    });

    describe('amd factory mode', () => {
        it('contains metadata as factory amd export', async () => {
            const { compilation } = await bundleUsingWebpack('amd:factory');
            const rawSource = compilation.assets['test.metadata.json.js'];

            expect(rawSource).to.be.an('object');
            expect(nullifyContentField(evalAssetModule(rawSource.source()))).to.eql(
                expectedMetadata
            );
        });
    });
});

function nullifyContentField(o: any) {
    (Array.isArray(o) ? o : Object.keys(o)).forEach(k => {
        if (k === 'content') {
            o[k] = null;
        } else if (o[k] && typeof o[k] === 'object') {
            nullifyContentField(o[k]);
        }
    });
    return o;
}

function evalAssetModule(source: string) {
    const mockedModule = { exports: {} };
    const moduleFactory = new Function(
        'module',
        'exports',
        '__webpack_public_path__',
        'define',
        source
    );
    moduleFactory(
        mockedModule,
        mockedModule.exports,
        '',
        (factory: any) =>
            (mockedModule.exports = typeof factory === 'function' ? factory() : factory)
    );
    return mockedModule.exports;
}
