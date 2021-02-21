import { expect } from 'chai';
import { readFileSync } from 'fs';
import nodeEval from 'node-eval';
import type { RuntimeStylesheet } from '@stylable/runtime';
import { process } from '@stylable/jest';

describe('jest process', () => {
    it('should process stylable sources', () => {
        const filename = require.resolve('./fixtures/test.st.css');
        const content = readFileSync(filename, 'utf8');
        const module = nodeEval(process(content, filename), filename) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`${module.namespace}__root`);
        expect(module.classes.test).to.equal(`${module.namespace}__test`);
    });
});
