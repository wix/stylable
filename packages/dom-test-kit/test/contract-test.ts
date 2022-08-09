import { statesRuntime } from '@stylable/runtime';
import type { PartialElement } from '@stylable/dom-test-kit';
import { expect } from 'chai';

export interface ContractClassDOM<T> {
    hasStyleState(el: T, stateName: string): boolean;
    getStyleState(el: T, stateName: string): string | boolean | null;
}

export interface AsyncContractClassDOM<T> {
    hasStyleState(el: T, stateName: string): Promise<boolean>;
    getStyleState(el: T, stateName: string): Promise<string | boolean | null>;
}

export function contractTest<T extends PartialElement>(
    util: ContractClassDOM<T> | AsyncContractClassDOM<T>,
    stylesheet: typeof testStylesheet,
    createElement: () => T
) {
    describe('Style state', () => {
        it('hasStyleState returns true if the requested style state exists', async () => {
            const elem = createElement();
            elem.classList.add(stylesheet.cssStates({ loading: true }));
            expect(await util.hasStyleState(elem, 'loading')).to.equal(true);
        });
        it('getStyleState returns the requested boolean style state value', async () => {
            const elem = createElement();
            elem.classList.add(stylesheet.cssStates({ loading: true }));
            expect(await util.getStyleState(elem, 'loading')).to.equal(true);
        });
        it('getStyleState returns the requested string style state value', async () => {
            const elem = createElement();
            elem.classList.add(stylesheet.cssStates({ loading: 'value' }));
            expect(await util.getStyleState(elem, 'loading')).to.equal('value');
        });
    });
}

export const testStylesheet = {
    namespace: 'ns',
    classes: { root: 'ns-root', x: 'ns__x', y: 'ns__y', z: 'ns__z ns__y' },
    cssStates: statesRuntime.bind(null, 'ns'),
};

export function createPartialElement(): PartialElement {
    // make sure we implement public api correctly
    // minimal DOM element interface
    type IsTrue<T extends true> = T;
    type _Check = IsTrue<HTMLElement extends PartialElement ? true : false>;

    const el = {
        __classes: new Set<string>(),
        className: '',
        classList: {
            contains: (className: string) => el.__classes.has(className),
            add: (className: string) => {
                el.__classes.add(className);
                el.className = [...el.__classes].join(' ');
            },
            remove: (className: string) => {
                el.__classes.delete(className);
                el.className = [...el.__classes].join(' ');
            },
            forEach(cb: (className: string) => void) {
                for (const className of el.__classes) {
                    cb(className);
                }
            },
        },
        getAttribute(attr: string) {
            if (attr === 'class') {
                return el.className;
            }
            throw new Error('Only class attribute is supported');
        },
        querySelector(_selector: string) {
            throw new Error('Not implemented.');
        },
        querySelectorAll(_selector: string) {
            throw new Error('Not implemented.');
        },
    };
    return el;
}
