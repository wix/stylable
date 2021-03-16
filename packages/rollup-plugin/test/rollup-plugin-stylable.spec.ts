import { nodeFs } from '@file-services/node';
import { expect } from 'chai';
import { rollupRunner } from './test-kit/rollup-runner';
import { getProjectPath } from './test-kit/test-helpers';

const getBodyStyles = () => {
    const { backgroundImage, backgroundColor, fontSize, fontFamily } = getComputedStyle(
        document.body
    );
    return {
        body: { backgroundImage, backgroundColor, fontSize, fontFamily },
    };
};

describe('StylableRollupPlugin', () => {
    const project = 'simple-stylable';

    const runner = rollupRunner({
        projectPath: getProjectPath(project),
    });

    it('should work', async () => {
        const { projectDir, serve, bundle, open } = runner;

        await bundle();
        const url = await serve();
        const page = await open(url, { headless: false });

        const { body } = await page.evaluate(getBodyStyles);

        expect(body.backgroundImage).to.match(/4274e208ab89b98e67658e01f8afd44704196eb1_asset.png/);
        expect(body.fontSize).to.equal('130px');
        expect(body.fontFamily).to.equal('monospace');

        await bundle(() => {
            nodeFs.writeFileSync(nodeFs.join(projectDir, 'index.st.css'), '');
        });

        await page.reload({ waitUntil: 'networkidle' });

        const { body: body2 } = await page.evaluate(getBodyStyles);

        expect(body2.backgroundImage).to.equal('none');
        expect(body2.fontSize).to.equal('16px');

        await bundle(async (done) => {
            nodeFs.writeFileSync(
                nodeFs.join(projectDir, 'index.st.css'),
                '.root {background: red}'
            );
            await done;
            await page.reload({ waitUntil: 'networkidle' });
        });

        const { body: body3 } = await page.evaluate(getBodyStyles);

        expect(body3.backgroundColor).to.equal('rgb(255, 0, 0)');
    });
});
