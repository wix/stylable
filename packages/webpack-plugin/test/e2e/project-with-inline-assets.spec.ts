import { browserFunctions, StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';

const project = 'project-with-inline-assets';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
            webpackOptions: {
                output: { path: join(projectDir, 'dist2') },
            },
        },
        before,
        afterEach,
        after,
    );

    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();
        const styleElements = await page.evaluate(browserFunctions.getStyleElementsMetadata);

        expect(styleElements).to.eql([{ id: './src/assets/assets.st.css', depth: '1' }]);
    });

    it('load assets from url() declaration value (dev)', async () => {
        const { page } = await projectRunner.openInBrowser();

        const { bg } = await page.evaluate(() => {
            return {
                bg: getComputedStyle(document.body).backgroundImage,
            };
        });

        expect(bg).to.equal(
            `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2BY9AIAAjABi8G3mj0AAAAASUVORK5CYII="), url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY3growIAAycBLhVrvukAAAAASUVORK5CYII=")`,
        );
    });
});

describe(`(${project}) production mode`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            webpackOptions: {
                mode: 'production',
                output: { path: join(projectDir, 'dist3') },
            },
        },
        before,
        afterEach,
        after,
    );

    it('load assets from url() declaration value (prod)', async () => {
        const { page } = await projectRunner.openInBrowser();
        const { bg } = await page.evaluate(() => {
            return {
                bg: getComputedStyle(document.body).backgroundImage,
            };
        });

        expect(bg).to.equal(
            `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2BY9AIAAjABi8G3mj0AAAAASUVORK5CYII="), url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY3growIAAycBLhVrvukAAAAASUVORK5CYII=")`,
        );
    });
});
