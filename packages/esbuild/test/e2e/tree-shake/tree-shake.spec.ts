import { expect } from 'chai';
import { ESBuildTestKit } from '../esbuild-testkit';

describe('Stylable ESBuild plugin - tree-shake', () => {
    const tk = new ESBuildTestKit({
        log: false,
        launchOptions: {
            headless: true,
        },
    });
    afterEach(() => tk.dispose());

    it('should not include unused js', async () => {
        const { read } = await tk.build({ project: 'tree-shake', buildExport: 'cssBundleProd' });
        const bundledJS = read('dist-bundle/index.js');

        expect(bundledJS, 'keyframes').to.not.include('keyframesX');
        expect(bundledJS, 'stVars').to.not.include('varX');
        expect(bundledJS, 'vars').to.not.include('propX');
        expect(bundledJS, 'layers').to.not.include('layerX');
        expect(bundledJS, 'containers').to.not.include('containerX');
    });
});
