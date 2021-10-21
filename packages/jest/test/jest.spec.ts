import { expect } from 'chai';
import { readFileSync } from 'fs';
import nodeEval from 'node-eval';
import { createTransformer } from '@stylable/jest';
import type { RuntimeStylesheet } from '@stylable/runtime';

describe('jest process', () => {
    it('should process stylable sources using createTransformer API', () => {
        const filename = require.resolve('@stylable/jest/test/fixtures/test.st.css');
        const content = readFileSync(filename, 'utf8');
        const module = nodeEval(
            createTransformer().process(content, filename),
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`${module.namespace}__root`);
        expect(module.classes.test).to.equal(`${module.namespace}__test`);
    });

    it('should process stylable sources with a custom namespace resolver', () => {
        const filename = require.resolve('@stylable/jest/test/fixtures/test.st.css');
        const content = readFileSync(filename, 'utf8');
        const module = nodeEval(
            createTransformer({
                stylable: { resolveNamespace: (ns, _srcPath) => `${ns}-custom` },
            }).process(content, filename),
            filename
        ) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`test-custom__root`);
        expect(module.classes.test).to.equal(`test-custom__test`);
    });
});
