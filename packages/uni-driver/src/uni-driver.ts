import { pseudoStates } from '@stylable/core';
import { StylableDOMUtil } from '@stylable/dom-test-kit';
import { RuntimeStylesheet, StateValue } from '@stylable/runtime';
import { UniDriver } from '@unidriver/core';

export type MiniUniDriver = Pick<UniDriver, 'hasClass' | 'attr'>
/**
 * This is an implementation of StylableDOMUtil for Unidriver.
 * Work-In-Progress: Not all methods are implemented yet !
 */
export class StylableUnidriverUtil {
    constructor(private stylesheet: RuntimeStylesheet) {}

    public async hasStyleState(
        base: MiniUniDriver,
        stateName: string,
        param: StateValue = true
    ): Promise<boolean> {
        const stateClass = this.stylesheet.cssStates({ [stateName]: param });
        return base.hasClass(stateClass);
    }
    public scopeSelector(selector?: string): string {
        return StylableDOMUtil.prototype.scopeSelector.call(this, selector);
    }
    public async getStyleState(base: MiniUniDriver, stateName: string): Promise<string | boolean | null> {
        const className = (await base.attr('class')) || '';
        if (!className.includes(stateName)) {
            return null;
        }
        const classList = className.trim().split(/\s+/);

        const booleanState = this.stylesheet.cssStates({ [stateName]: true });
        if (classList.includes(booleanState)) {
            return true;
        }

        const baseState = this.getBaseStateWithParam(stateName);

        let paramValue = '';
        classList.forEach(cls => {
            if (!paramValue) {
                paramValue = this.getStateValueFromClassName(cls, baseState);
            }
        });

        return paramValue ? paramValue : null;
    }

    public getStateValueFromClassName(cls: string, baseState: string) {
        if (cls.startsWith(baseState)) {
            const param = cls.slice(baseState.length);
            const paramIndex = param.indexOf(pseudoStates.stateMiddleDelimiter);

            if (paramIndex !== -1) {
                return param.slice(paramIndex + 1);
            }
        }
        return '';
    }

    private getBaseStateWithParam(stateName: string) {
        const singleCharState = 'x';
        return this.stylesheet.cssStates({ [stateName]: singleCharState }).slice(0, -3);
    }
}
