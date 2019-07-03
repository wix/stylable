import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { process } from '../src/jest';
const evalNode = require('node-eval');

describe('jest process', () => {
    it('should process stylable sources', () => {
        const filename = join(__dirname, 'fixtures', 'test.st.css');
        const content = readFileSync(filename, 'utf8');
        const module = evalNode(process(content, filename), filename);

        expect(module.classes.root).to.equal(`${module.namespace}__root`);
        expect(module.classes.test).to.equal(`${module.namespace}__test`);
    });
});
