import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hashContent } from '../../../../src/hash-content-util';
import { EOL } from 'os';

describe(`(${__dirname})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: __dirname,
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    it('Should generate manifest for the current build', () => {
        const assets = projectRunner.getBuildAssets();
        const manifestKey = Object.keys(assets).find((key) => key.startsWith('stylable.manifest'))!;
        const source = assets[manifestKey].source();

        const compContent = readFileSync(
            join(projectRunner.projectDir, 'Button.comp.st.css'),
            'utf-8'
        );
        const commonContent = readFileSync(
            join(projectRunner.projectDir, 'common.st.css'),
            'utf-8'
        );
        const commonHash = hashContent(commonContent);
        const compHash = hashContent(compContent);

        expect(JSON.parse(source)).to.deep.include({
            componentsIndex: `:import{-st-from: "/${compHash}.st.css";-st-default: Button;} Button{}${EOL}`,
            componentsEntries: { Button: `/${compHash}.st.css` },
            stylesheetMapping: {
                [`/${compHash}.st.css`]: compContent.replace(
                    './common.st.css',
                    `/${commonHash}.st.css`
                ),
                [`/${commonHash}.st.css`]: commonContent,
            },
            namespaceMapping: {
                [`/${commonHash}.st.css`]: 'common911354609',
                [`/${compHash}.st.css`]: 'Buttoncomp1090430236',
            },
        });
    });
});
