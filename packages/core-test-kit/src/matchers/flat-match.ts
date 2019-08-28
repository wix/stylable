import { expect } from 'chai';
import flatten from 'flat';

export function flatMatch(chai: any, util: any) {
    const { flag } = util;
    chai.Assertion.addMethod('flatMatch', function(this: any, obj: {}, maxDepth: number = 5) {
        expect(flatten(flag(this, 'object'), { maxDepth })).to.contain(flatten(obj));
    });
}
