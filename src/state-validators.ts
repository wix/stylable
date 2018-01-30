import { Pojo } from './types';

export interface StateParamType {
    subValidators: Pojo<(value: string, ...rest: string[]) => boolean>;
    validate(value: any): boolean;
}

export const systemValidators: Pojo<StateParamType> = {
    string: {
        validate(value: any) { return typeof value === 'string'; },
        subValidators: {
            contains: (value: string, checkedValue: string) => !!~value.indexOf(checkedValue),
            minLength: (value: string, length: string) => value.length > Number(length),
            maxLength: (value: string, length: string) => value.length < Number(length)
        }
    },
    number: {
        validate(value: any) { return value && !isNaN(value); },
        subValidators: {
            min: (value: string, minValue: string) => Number(value) > Number(minValue),
            max: (value: string, maxValue: string) => Number(value) < Number(maxValue),
            multipleOf: (value: string, multipleOf: string) => Number(value) % Number(multipleOf) === 0
        }
    }
};
