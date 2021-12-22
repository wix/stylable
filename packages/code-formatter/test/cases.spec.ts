import { expect } from 'chai';
import { join } from 'path';
import { forEachTestCase, loadDirStructureSync } from './test-kit';

function format(_: string) {
    return _;
}

describe('Formatting', () => {
    const casesDir = join(
        require.resolve('@stylable/code-formatter/package.json'),
        '../test',
        'cases'
    );
    const struct = loadDirStructureSync(casesDir);

    forEachTestCase(struct, ({ parent, input, out }: any) => {
        it(`${join(parent, input.name)} -> ${join(parent, out.name)}`, () => {
            expect(format(input.value)).to.equal(out.value);
        });
    });
});
