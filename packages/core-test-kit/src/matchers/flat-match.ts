// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="chai" />

import { expect } from 'chai';
import flatten from 'flat';

export const flatMatch: Chai.ChaiPlugin = (chai, util) => {
    const { flag } = util;
    chai.Assertion.addMethod('flatMatch', function (obj: Record<string, unknown>, maxDepth = 5) {
        expect(flatten(flag(this, 'object'), { maxDepth })).to.contain(flatten(obj));
    });
};
