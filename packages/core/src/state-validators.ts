import { Pojo, StateArguments } from './types';

export interface StateResult {
    res: string;
    errors: string[] | null;
}

/* tslint:disable:max-line-length */
const validationErrors = {
    string: {
        STRING_TYPE_VALIDATION_FAILED: (actualParam: string) => `"${actualParam}" should be of type string`,
        REGEX_VALIDATION_FAILED: (regex: string, actualParam: string) => `expected "${actualParam}" to match regex "${regex}"`,
        CONTAINS_VALIDATION_FAILED: (shouldContain: string, actualParam: string) => `expected "${actualParam}" to contain string "${shouldContain}"`,
        MIN_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) => `expected "${actualParam}" to be of length longer than or equal to ${length}`,
        MAX_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) => `expected "${actualParam}" to be of length shorter than or equal to ${length}`,
        UKNOWN_VALIDATOR: (name: string) => `encountered unknown string validator "${name}"`
    },
    number: {
        NUMBER_TYPE_VALIDATION_FAILED: (actualParam: string) => `expected "${actualParam}" to be of type number`,
        MIN_VALIDATION_FAILED: (actualParam: string, min: string) => `expected "${actualParam}" to be larger than or equal to ${min}`,
        MAX_VALIDATION_FAILED: (actualParam: string, max: string) => `expected "${actualParam}" to be lesser then or equal to ${max}`,
        MULTIPLE_OF_VALIDATION_FAILED: (actualParam: string, multipleOf: string) => `expected "${actualParam}" to be a multiple of ${multipleOf}`,
        UKNOWN_VALIDATOR: (name: string) => `encountered unknown number validator "${name}"`
    },
    enum: {
        ENUM_TYPE_VALIDATION_FAILED: (actualParam: string, options: string[]) => `expected "${actualParam}" to be one of the options: "${options.join(', ')}"`,
        NO_OPTIONS_DEFINED: () => `expected enum to be defined with one option or more`
    },
    tag: {
        NO_SPACES_ALLOWED: (actualParam: string) => `expected "${actualParam}" to be a single value with no spaces`
    }
};
/* tslint:enable:max-line-length */

export type SubValidator = (value: string, ...rest: string[]) => StateResult;

export interface StateParamType {
    subValidators?: Pojo<SubValidator>;
    validate(
        value: any,
        args: StateArguments,
        resolveParam: any,
        validateDefinition: boolean,
        validateValue: boolean): StateResult;
}

export const systemValidators: Pojo<StateParamType> = {
    string: {
        validate(
            value: any,
            validators: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue) {

            const res = value;
            const errors: string[] = [];

            if (validateValue && typeof value !== 'string') {
                errors.push(validationErrors.string.STRING_TYPE_VALIDATION_FAILED(value));
            }

            if (validators.length > 0) {
                validators.forEach(validatorMeta => {
                    if (typeof validatorMeta === 'object') {
                        if (this.subValidators && this.subValidators[validatorMeta.name]) {
                            const subValidator = this.subValidators[validatorMeta.name];

                            const validationRes = subValidator(value, resolveParam(validatorMeta.args[0]));

                            if (validateValue && validationRes.errors) {
                                errors.push(...validationRes.errors);
                            }
                        } else if (validateDefinition) {
                            errors.push(validationErrors.string.UKNOWN_VALIDATOR(validatorMeta.name));
                        }
                    }
                });
            }

            return { res, errors: errors.length ? errors : null };
        },
        subValidators: {
            regex: (value: string, regex: string) => {
                const r = new RegExp(regex);
                const valid = r.test(value);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.string.REGEX_VALIDATION_FAILED(regex, value)]
                };
            },
            contains: (value: string, checkedValue: string) => {
                const valid = !!~value.indexOf(checkedValue);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.string.CONTAINS_VALIDATION_FAILED(checkedValue, value)]
                };
            },
            minLength: (value: string, length: string) => {
                const valid = value.length > Number(length);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.string.MIN_LENGTH_VALIDATION_FAILED(length, value)]
                };
            },
            maxLength: (value: string, length: string) => {
                const valid = value.length < Number(length);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.string.MAX_LENGTH_VALIDATION_FAILED(length, value)]
                };
            }
        }
    },
    number: {
        validate(
            value: any,
            validators: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue) {

            const res = value;
            const errors: string[] = [];

            if (isNaN(value)) {
                if (validateValue) {
                    errors.push(validationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(value));
                }
            } else if (validators.length > 0) {
                validators.forEach(validatorMeta => {
                    if (typeof validatorMeta === 'object') {
                        if (this.subValidators && this.subValidators[validatorMeta.name]) {
                            const subValidator = this.subValidators[validatorMeta.name];

                            const validationRes = subValidator(value, resolveParam(validatorMeta.args[0]));

                            if (validateValue && validationRes.errors) {
                                errors.push(...validationRes.errors);
                            }
                        } else if (validateDefinition) {
                            errors.push(validationErrors.number.UKNOWN_VALIDATOR(validatorMeta.name));
                        }
                    }
                });
            }

            return { res, errors: errors.length ? errors : null };
        },
        subValidators: {
            min: (value: string, minValue: string) => {
                const valid = Number(value) > Number(minValue);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.number.MIN_VALIDATION_FAILED(value, minValue)]
                };
            },
            max: (value: string, maxValue: string) => {
                const valid = Number(value) < Number(maxValue);

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.number.MAX_VALIDATION_FAILED(value, maxValue)]
                };
            },
            multipleOf: (value: string, multipleOf: string) => {
                const valid = Number(value) % Number(multipleOf) === 0;

                return {
                    res: value,
                    errors: valid ?
                        null :
                        [validationErrors.number.MULTIPLE_OF_VALIDATION_FAILED(value, multipleOf)]
                };
            }
        }
    },
    enum: {
        validate(
            value: any,
            options: StateArguments,
            resolveParam: (s: string) => string,
            validateDefinition,
            validateValue) {

            const res = value;
            const errors: string[] = [];

            const stringOptions: string[] = [];

            if (options.length) {
                const isOneOf = options.some(option => {
                    if (typeof option === 'string') {
                        stringOptions.push(option);
                        return resolveParam(option) === value;
                    }
                    return true;
                });
                if (validateValue && !isOneOf) {
                    errors.push(validationErrors.enum.ENUM_TYPE_VALIDATION_FAILED(value, stringOptions));
                }
            } else if (validateDefinition) {
                errors.push(validationErrors.enum.NO_OPTIONS_DEFINED());
            }

            return { res, errors: errors.length ? errors : null };
        }
    },
    tag: {
        validate(
            value: any,
            _options: StateArguments,
            _resolveParam: (s: string) => string,
            _validateDefinition,
            validateValue) {

            const errors: string[] = [];

            if (validateValue && ~value.indexOf(' ')) {
                errors.push(validationErrors.tag.NO_SPACES_ALLOWED(value));
            }

            return { res: value, errors: errors.length ? errors : null };
        }
    }
};
