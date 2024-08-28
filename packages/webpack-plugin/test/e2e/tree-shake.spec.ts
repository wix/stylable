import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const project = 'tree-shake';
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
        },
        before,
        afterEach,
        after,
    );

    it('should inline classes and remove the stylesheet js module', () => {
        const files = projectRunner.getProjectFiles();
        expect(files['dist/main.js']).to.eql(
            `(()=>{"use strict";document.body.innerHTML='<div class="index__bbb">bbb used</div>'})();\n//# sourceMappingURL=main.js.map`,
        );
    });
});
