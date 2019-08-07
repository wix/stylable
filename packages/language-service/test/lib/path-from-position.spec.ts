import { expect } from 'chai';
import { getPath } from '../../test-kit/asserters';

describe('Path parser', () => {
    it('Should add selector with no end if broken', () => {
        const path = getPath('paths/broken.st.css');
        expect(path.length).to.equal(3);
        expect(path[1].source).to.not.have.property('end');
    });

    it('Should not add selector if position is not inside ruleset', () => {
        const path = getPath('paths/outside-ruleset.st.css');
        expect(path.length).to.equal(1);
    });

    it('Should not add selector if broken and position is before ruleset', () => {
        const path = getPath('paths/outside-ruleset.st.css');
        expect(path.length).to.equal(1);
    });
});
