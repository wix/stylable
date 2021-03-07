import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { StylableProjectRunner } from '@stylable/e2e-test-kit';

const project = 'watched-project-error-recovery';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-plugin/test/e2e/projects/${project}/webpack.config`)
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after,
        true
    );
    it('renders css', async () => {
        const { page } = await projectRunner.openInBrowser();

        const color = await page.evaluate(() => getComputedStyle(document.body).color);
        expect(color).to.equal('rgb(255, 0, 0)');

        await projectRunner.actAndWaitForRecompile(
            'make a change',
            () => {
                writeFileSync(
                    join(projectRunner.projectDir, 'src', 'index.st.css'),
                    '.root{ color: green; }'
                );
            },
            async () => {
                await page.reload({ waitUntil: 'networkidle' });
                const color = await page.evaluate(() => getComputedStyle(document.body).color);
                expect(color).to.equal('rgb(0, 128, 0)');
            }
        );

        await projectRunner.actAndWaitForRecompile(
            'break the output',
            () => {
                writeFileSync(
                    join(projectRunner.projectDir, 'src', 'index.st.css'),
                    '.root{ color:: blue; }'
                );
            },
            async () => {
                await page.reload({ waitUntil: 'networkidle' });
                const e = projectRunner.getBuildErrorMessages();

                expect(e.length, 'one error').to.equal(1);
                expect(e[0].constructor.name, 'one error').to.equal('CssSyntaxError');
                expect(e[0].message).to.match(/Double colon/);

                const color = await page.evaluate(() => getComputedStyle(document.body).color);
                expect(color).to.equal('rgb(0, 0, 0)');
            }
        );

        await projectRunner.actAndWaitForRecompile(
            'fix the output',
            () => {
                writeFileSync(
                    join(projectRunner.projectDir, 'src', 'index.st.css'),
                    '.root{ color: blue; }'
                );
            },
            async () => {
                await page.reload({ waitUntil: 'networkidle' });

                const color = await page.evaluate(() => getComputedStyle(document.body).color);
                // Broken css never loaded to the browser
                expect(color).to.equal('rgb(0, 0, 255)');
            }
        );
    });
});
