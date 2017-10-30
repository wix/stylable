import { expect } from 'chai';

export function matchCSSMatchers(chai: any, util: any) {
    const { flag } = util;
    chai.Assertion.addMethod('matchCSS', function(this: any, css: string | string[]) {
        let element = flag(this, 'object');
        if (!Array.isArray(css)) {
            css = [css];
        }
        if (!Array.isArray(element)) {
            element = [element];
        }
        // TODO: better reporting.
        expect(element.length).to.equal(css.length);
        css.forEach((chunk, index) => expect(element[index]).to.eql(chunk));
    });
}
