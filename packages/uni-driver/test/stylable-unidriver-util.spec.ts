import {
    contractTest,
    testStylesheet,
    createPartialElement,
} from '@stylable/dom-test-kit/dist/test/contract-test';
import type { PartialElement } from '@stylable/dom-test-kit';
import { ElementRemoteApi, StylableUnidriverUtil } from '@stylable/uni-driver';

function createHost(): PartialElement & ElementRemoteApi {
    const el = createPartialElement();
    return Object.assign(el, {
        attr(name: string) {
            return Promise.resolve(el.getAttribute(name));
        },
        hasClass(className: string) {
            return Promise.resolve(el.classList.contains(className));
        },
    });
}

describe('stylable-dom-utils (UniDriver)', () => {
    contractTest<PartialElement & ElementRemoteApi>(
        new StylableUnidriverUtil(testStylesheet),
        testStylesheet,
        createHost
    );
});
