import { contractTest } from '@stylable/dom-test-kit/dist/test/contract-test';
import { ElementRemoteApi, StylableUnidriverUtil } from '@stylable/uni-driver';
import { MinimalDocument } from '@stylable/core-test-kit';

function wrapWithMiniUni(el: HTMLElement): ElementRemoteApi {
    return Object.assign(el, {
        attr(name: string) {
            return Promise.resolve(el.getAttribute(name));
        },
        hasClass(className: string) {
            return Promise.resolve(el.classList.contains(className));
        },
    });
}

const minDoc = new MinimalDocument();

describe(
    'stylable-dom-utils (UniDriver)',
    contractTest(StylableUnidriverUtil, {
        scopeSelectorTest: false,
        createElement: () => wrapWithMiniUni(minDoc.createElement('div') as any) as any,
    }),
);
