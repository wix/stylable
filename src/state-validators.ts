export interface StringValidatorFunctions {
    contains: (value: string, checkedValue: string) => boolean;
    minLength: (value: string, length: string) => boolean;
    maxLength: (value: string, length: string) => boolean;
}

export interface ValidatorFunctions {
    string: StringValidatorFunctions;
}

export const validators: ValidatorFunctions = {
    string: {
        contains: (value: string, checkedValue: string) => !!~value.indexOf(checkedValue),
        minLength: (value: string, length: string) => value.length > Number(length),
        maxLength: (value: string, length: string) => value.length < Number(length)
    }
};
