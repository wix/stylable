import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import nodeEval from 'node-eval';
import { RuntimeStylesheet } from '@stylable/runtime';
import { process } from '../src/jest';

describe('jest process', () => {
    it('should process stylable sources', () => {
        const filename = join(__dirname, 'fixtures', 'test.st.css');
        const content = readFileSync(filename, 'utf8');
        const module = nodeEval(process(content, filename), filename) as RuntimeStylesheet;

        expect(module.classes.root).to.equal(`${module.namespace}__root`);
        expect(module.classes.test).to.equal(`${module.namespace}__test`);
    });
});
