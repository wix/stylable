import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname, join } from 'path';
import { EOL } from 'os';
import { getSheetContentAndHash } from './utils';

const project = 'manifest-plugin';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-extensions/test/e2e/projects/${project}/webpack.config`)
);

describe(`${project} - manifest (vars)`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            configName: 'webpack.css-vars.config',
            webpackOptions: {
                output: { path: join(projectDir, 'dist3') },
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

        const button = getSheetContentAndHash(join(projectRunner.testDir, 'Button.comp.st.css'));
        const accordion = getSheetContentAndHash(
            join(projectRunner.testDir, 'Accordion.comp.st.css')
        );
        const common = getSheetContentAndHash(join(projectRunner.testDir, 'common.st.css'));

        expect(JSON.parse(source)).to.deep.include({
            name: 'manifest-plugin-test',
            version: '0.0.0-test',
            componentsIndex: [
                `:import{-st-from: "/${accordion.hash}.st.css";-st-default: Accordion;-st-named:--myColor as --Accordion-myColor;} .root Accordion{}`,
                `:import{-st-from: "/${button.hash}.st.css";-st-default: Button;-st-named:--myColor as --Button-myColor;} .root Button{}`,
                ``, // empty line
            ].join(EOL),
            componentsEntries: {
                Button: `/${button.hash}.st.css`,
                Accordion: `/${accordion.hash}.st.css`,
            },
            stylesheetMapping: {
                [`/${button.hash}.st.css`]: button.content.replace(
                    './common.st.css',
                    `/${common.hash}.st.css`
                ),
                [`/${accordion.hash}.st.css`]: accordion.content.replace(
                    './common.st.css',
                    `/${common.hash}.st.css`
                ),
                [`/${common.hash}.st.css`]: common.content,
            },
            namespaceMapping: {
                [`/${common.hash}.st.css`]: 'common911354609',
                [`/${button.hash}.st.css`]: 'Buttoncomp1090430236',
                [`/${accordion.hash}.st.css`]: 'Accordioncomp4108556147',
            },
        });
    });
});
