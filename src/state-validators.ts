export interface StringValidatorFunctions {
    contains: (value: string, checkedValue: string) => boolean;
}

export interface ValidatorFunctions {
    string: StringValidatorFunctions;
}

export const validators: ValidatorFunctions = {
    string: {
        contains: (value: string, checkedValue: string) => !!~value.indexOf(checkedValue)
    }
};
