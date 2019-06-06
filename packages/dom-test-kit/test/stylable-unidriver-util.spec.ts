import { MiniUniDriver, StylableUnidriverUtil } from '../src';
import { contractTest } from './contract-test';

function wrapWithMiniUni(el: HTMLElement): MiniUniDriver {
    return {
        async attr(name) {
            return el.getAttribute(name);
        },
        async hasClass(className) {
            return el.classList.contains(className);
        }
    };
}

describe('stylable-dom-utils (UniDriver)', contractTest(StylableUnidriverUtil, wrapWithMiniUni));
