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

    it('should tokenize complex st-vars', () => {
        tk.populate({
            'test.st.css': `
            :vars {
                a: st-map(b st-array(red,
                    blue,
                    st-map(c green, d gold)))
            }`,
        });
        const dts = tk.read('test.st.css.d.ts');

        const out = tokenizeDTS(dts);

        const stVars = out.find(({ type }) => type === 'stVars')!;
        const a = stVars.tokens[0];
        const b = stVars.tokens[1];
        const c = stVars.tokens[2];
        const d = stVars.tokens[3];

        expect(stVars.tokens.length, 'generate all st-vars tokens').to.equal(4);
        expect(a, 'generate token for variable a').to.eql({
            value: '"a"',
            type: 'string',
            start: 210,
            end: 213,
            line: 12,
            column: 4,
        });
        expect(b, 'generate token for variable b').to.eql({
            value: '"b"',
            type: 'string',
            start: 225,
            end: 228,
            line: 13,
            column: 8,
        });
        expect(c, 'generate token for variable c').to.eql({
            value: '"c"',
            type: 'string',
            start: 302,
            end: 305,
            line: 17,
            column: 16,
        });
        expect(d, 'generate token for variable d').to.eql({
            value: '"d"',
            type: 'string',
            start: 331,
            end: 334,
            line: 18,
            column: 16,
        });
    });
});
