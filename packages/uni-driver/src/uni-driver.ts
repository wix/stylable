import type { ElementRemoteApi, MinimalStylesheet, StateValue } from './types';

const stateMiddleDelimiter = '-';

export class StylableUnidriverUtil {
    constructor(private stylesheet: MinimalStylesheet) {}

    public async hasStyleState(
        base: ElementRemoteApi,
        stateName: string,
        param: StateValue = true
    ): Promise<boolean> {
        const stateClass = this.stylesheet.cssStates({ [stateName]: param });
        return base.hasClass(stateClass);
    }
    public async getStyleState(
        base: ElementRemoteApi,
        stateName: string
    ): Promise<string | boolean | null> {
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
        classList.forEach((cls) => {
            if (!paramValue) {
                paramValue = this.getStateValueFromClassName(cls, baseState);
            }
        });

        return paramValue ? paramValue : null;
    }

    public getStateValueFromClassName(cls: string, baseState: string) {
        if (cls.startsWith(baseState)) {
            const param = cls.slice(baseState.length);
            const paramIndex = param.indexOf(stateMiddleDelimiter);

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
