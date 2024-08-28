import { expect } from 'chai';
import { dirname, join } from 'path';
import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { promises } from 'fs';

const { writeFile, readFile } = promises;

const project = 'hd-cache';
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
            watchMode: true,
            useTempDir: true,
        },
        before,
        afterEach,
        after,
    );
    it('renders css', async () => {
        await projectRunner.actAndWaitForRecompile('include box component', async () => {
            const indexPath = join(projectRunner.testDir, 'src', 'index.js');
            const indexSource = await readFile(indexPath, 'utf8');
            return writeFile(indexPath, commentAndUnCommentLines(indexSource));
        });

        const { page } = await projectRunner.openInBrowser();
        const { box } = await page.evaluate(() => {
            const { backgroundColor } = getComputedStyle(document.querySelector('.box-component')!);
            return {
                box: { backgroundColor },
            };
        });
        expect(box.backgroundColor).to.equal(`rgb(255, 0, 0)`);
    });
});

function commentAndUnCommentLines(source: string) {
    return source
        .replace(/\/\*\s+COMMENT_LINE\s+\*\//g, '// ')
        .replace(/\/\*\s+UNCOMMENT_LINE\s+(.*?)\s+\*\//g, '$1');
}
