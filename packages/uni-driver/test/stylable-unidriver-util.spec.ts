/* eslint-disable @typescript-eslint/require-await */
import { contractTest } from '@stylable/dom-test-kit/test/contract-test';
import { ElementRemoteApi, StylableUnidriverUtil } from '../src';

function wrapWithMiniUni(el: HTMLElement): ElementRemoteApi {
    return {
        async attr(name) {
            return el.getAttribute(name);
        },
        async hasClass(className) {
            return el.classList.contains(className);
        }
    };
}

describe(
    'stylable-dom-utils (UniDriver)',
    contractTest(StylableUnidriverUtil, wrapWithMiniUni, { scopeSelectorTest: false })
);
