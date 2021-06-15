import { DTSKit } from '@stylable/e2e-test-kit';
import { getLocalClassStates, tokenizeDTS } from '@stylable/module-utils/dist/dts-rough-tokenizer';
import { expect } from 'chai';

describe('tokenizeDTS (e2e)', () => {
    let tk: DTSKit;

    beforeEach(() => {
        tk = new DTSKit();
    });

    afterEach(() => {
        tk.dispose();
    });

    it('should tokenize simple states', () => {
        tk.populate({
            'test.st.css': '.root{-st-states: myState, myState2(string), myState3(enum(a, b, c));}',
        });
        const dts = tk.read('test.st.css.d.ts');

        const out = tokenizeDTS(dts);

        const states = getLocalClassStates('root', out);

        expect(states[0].stateName.value, 'stateName').to.equal('"myState"');
        expect(states[0].type[0].value, 'stateValue Type').to.equal('boolean');

        expect(states[1].stateName.value, 'stateName2').to.equal('"myState2"');
        expect(states[1].type[0].value, 'stateValue Type string').to.equal('string');

        expect(states[2].stateName.value, 'stateName3').to.equal('"myState3"');
        expect(states[2].type[0].value, 'stateValue Type enum a').to.equal('"a"');
        expect(states[2].type[2].value, 'stateValue Type enum b').to.equal('"b"');
        expect(states[2].type[4].value, 'stateValue Type enum c').to.equal('"c"');
    });
});
