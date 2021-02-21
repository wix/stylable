import { contractTest } from '@stylable/dom-test-kit/dist/test/contract-test';
import { ElementRemoteApi, StylableUnidriverUtil } from '@stylable/uni-driver';

function wrapWithMiniUni(el: HTMLElement): ElementRemoteApi {
    return {
        attr(name) {
            return Promise.resolve(el.getAttribute(name));
        },
        hasClass(className) {
            return Promise.resolve(el.classList.contains(className));
        },
    };
}

describe(
    'stylable-dom-utils (UniDriver)',
    contractTest(StylableUnidriverUtil, wrapWithMiniUni, { scopeSelectorTest: false })
);
