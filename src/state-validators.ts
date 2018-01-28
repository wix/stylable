export interface StringValidatorFunctions {
    contains: (value: string, checkedValue: string) => boolean;
    minLength: (value: string, length: string) => boolean;
    maxLength: (value: string, length: string) => boolean;
}

export interface NumberValidatorFunctions {
    min: (value: string, minValue: string) => boolean;
    max: (value: string, maxValue: string) => boolean;
    multipleOf: (value: string, multipleOf: string) => boolean;
}

export interface ValidatorFunctions {
    string: StringValidatorFunctions;
    number: NumberValidatorFunctions;
}

export const validators: ValidatorFunctions = {
    string: {
        contains: (value: string, checkedValue: string) => !!~value.indexOf(checkedValue),
        minLength: (value: string, length: string) => value.length > Number(length),
        maxLength: (value: string, length: string) => value.length < Number(length)
    },
    number: {
        min: (value: string, minValue: string) => Number(value) > Number(minValue),
        max: (value: string, maxValue: string) => Number(value) < Number(maxValue),
        multipleOf: (value: string, multipleOf: string) => Number(value) % Number(multipleOf) === 0
    }
};
