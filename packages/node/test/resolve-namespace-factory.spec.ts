import { expect } from 'chai';
import { dirname, join } from 'path';
import { resolveNamespace, resolveNamespaceFactory } from '@stylable/node';

const fixturesPath = dirname(require.resolve('@stylable/node/test/fixtures/package.json'));

describe('resolve-namespace-factory deterministic behavior', () => {
    it('default behavior', () => {
        const stylesheetPath = join(fixturesPath, 'plain.st.css');
        const namespace = resolveNamespaceFactory()('X', stylesheetPath);
        expect(namespace).to.equal('X1033922336');
        expect(namespace).to.equal(resolveNamespace('X', stylesheetPath));
    });

    it('hashSalt behavior', () => {
        const stylesheetPath = join(fixturesPath, 'plain.st.css');
        const namespace1 = resolveNamespaceFactory('1')('X', stylesheetPath);
        const namespace2 = resolveNamespaceFactory('2')('X', stylesheetPath);
        expect(namespace1).to.equal('X2873317666');
        expect(namespace2).to.equal('X1439667096');
        expect(namespace1).to.not.equal(namespace2);
    });

    it('prefix behavior', () => {
        const stylesheetPath = join(fixturesPath, 'plain.st.css');
        const namespace = resolveNamespaceFactory('', 'PREFIX_')('X', stylesheetPath);
        expect(namespace).to.equal('PREFIX_X1033922336');
    });
});
