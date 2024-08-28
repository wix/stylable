import { EOL } from 'os';
import { dirname, join } from 'path';
import { expect } from 'chai';
import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import type { ComponentsMetadata } from '@stylable/webpack-extensions';
import { getSheetContentAndHash } from './utils';

const project = 'manifest-plugin';
const projectDir = dirname(
    require.resolve(`@stylable/webpack-extensions/test/e2e/projects/${project}/webpack.config`),
);

describe(`${project} - fs-manifest`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir,
            launchOptions: {
                // headless: false
            },
            configName: 'webpack.fs-manifest.config',
        },
        before,
        afterEach,
        after,
    );

    it('Should generate manifest for the current build', () => {
        const assets = projectRunner.getBuildAssets();
        const manifestKey = Object.keys(assets).find((key) => key.startsWith('stylable.manifest'))!;
        const source = assets[manifestKey].source();

        const button = getSheetContentAndHash(join(projectRunner.testDir, 'Button.comp.st.css'));
        const accordion = getSheetContentAndHash(
            join(projectRunner.testDir, 'Accordion.comp.st.css'),
        );
        const common = getSheetContentAndHash(join(projectRunner.testDir, 'common.st.css'));

        const fsMetadata: ComponentsMetadata = {
            name: 'manifest-plugin-test',
            version: '0.0.0-test',
            components: {
                Button: {
                    id: 'Button',
                    namespace: 'Buttoncomp1090430236',
                    stylesheetPath: `/${button.hash}.st.css`,
                },
                Accordion: {
                    id: 'Accordion',
                    namespace: 'Accordioncomp4108556147',
                    stylesheetPath: `/${accordion.hash}.st.css`,
                },
            },
            fs: {
                [`/manifest-plugin-test/index.st.css`]: {
                    content: [
                        `:import{-st-from: "/${accordion.hash}.st.css";-st-default: Accordion;} .root Accordion{}`,
                        `:import{-st-from: "/${button.hash}.st.css";-st-default: Button;} .root Button{}`,
                        ``, // empty line
                    ].join(EOL),
                    metadata: {
                        namespace: 'manifest-plugin-test',
                    },
                },
                [`/${button.hash}.st.css`]: {
                    content: button.content.replace('./common.st.css', `/${common.hash}.st.css`),
                    metadata: { namespace: 'Buttoncomp1090430236' },
                },
                [`/${accordion.hash}.st.css`]: {
                    content: accordion.content.replace('./common.st.css', `/${common.hash}.st.css`),
                    metadata: { namespace: 'Accordioncomp4108556147' },
                },
                [`/${common.hash}.st.css`]: {
                    content: common.content,
                    metadata: { namespace: 'common911354609' },
                },
            },
            packages: {},
        };
        expect(JSON.parse(source)).to.deep.include(fsMetadata);
    });
});
