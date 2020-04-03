import { expect } from 'chai';
import flatten from 'flat';

export function flatMatch(chai: Chai.ChaiStatic, util: Chai.ChaiUtils) {
    const { flag } = util;
    chai.Assertion.addMethod('flatMatch', function (obj: {}, maxDepth = 5) {
        expect(flatten(flag(this, 'object'), { maxDepth })).to.contain(flatten(obj));
    });
}
