const flatten = require('flat');

import { expect } from 'chai';

export function flatMatch(chai: any, util: any) {
    const { flag } = util;
    chai.Assertion.addMethod('flatMatch', function(this: any, obj: {}, maxDepth = 5) {
        expect(flatten(flag(this, 'object'), { maxDepth })).to.contain(flatten(obj));
    });
}
