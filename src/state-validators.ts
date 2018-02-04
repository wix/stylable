import { Pojo, StateArguments } from './types';

export interface StateResult {
    res: string;
    error: string | null;
}

/* tslint:disable:max-line-length */
const validationErrors = {
    string: {
        STRING_TYPE_VALIDATION_FAILED: (actualParam: string) => ` - "${actualParam}" should be of type string but failed validation`,
        REGEX_VALIDATION_FAILED: (regex: string, actualParam: string) => ` - string type failed regex "${regex}" validation with: "${actualParam}"`,
        CONTAINS_VALIDATION_FAILED: (shouldContain: string, actualParam: string) => ` - parameter "${actualParam}" of type string should contain string: "${shouldContain}"`,
        MIN_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) => ` - parameter "${actualParam}" failed min length (${length}) validation`,
        MAX_LENGTH_VALIDATION_FAILED: (length: string, actualParam: string) => ` - parameter "${actualParam}" failed max length (${length}) validation`
    },
    number: {
        NUMBER_TYPE_VALIDATION_FAILED: (actualParam: string) => ` - "${actualParam}" should be of type number but failed validation`,
        MIN_VALIDATION_FAILED: (actualParam: string, min: string) => ` - parameter "${actualParam}" failed min(${min}) validation`,
        MAX_VALIDATION_FAILED: (actualParam: string, max: string) => ` - parameter "${actualParam}" failed max(${max}) validation`,
        MULTIPLE_OF_VALIDATION_FAILED: (actualParam: string, multipleOf: string) => ` - parameter "${actualParam}" should be a multiple of ${multipleOf}`
    }
};
/* tslint:enable:max-line-length */

export interface StateParamType {
    subValidators: Pojo<(value: string, ...rest: string[]) => StateResult>;
    validate(value: any, args: StateArguments, resolveParam: any): StateResult;
}

function createError(errors: string[]) {
    // TODO: wrap errors nicely
    return errors.join('\n');
}

export const systemValidators: Pojo<StateParamType> = {
    string: {
        validate(value: any, validators: StateArguments, resolveParam: (s: string) => string) {
            const res: StateResult = {
                res: value,
                error: null
            };
            const errors: string[] = [];

            if (typeof value !== 'string') {
                errors.push(validationErrors.string.STRING_TYPE_VALIDATION_FAILED(value));
            }

            if (validators.length > 0) {
                validators.map(validatorMeta => {
                    const firstArg = validators[0];

                    if (typeof firstArg === 'string') {
                        const r = new RegExp(firstArg);

                        if (!r.test(value)) {
                            errors.push(validationErrors.string.REGEX_VALIDATION_FAILED(firstArg, value));
                        }
                    } else if (typeof validatorMeta === 'object') {
                        const subValidator = this.subValidators[validatorMeta.name];
                        if (subValidator) {
                            const validationRes = subValidator(value, resolveParam(validatorMeta.args[0]));
                            if (validationRes.error) {
                                errors.push(validationRes.error);
                            }
                        } else {
                            // push missing sub validator
                        }
                    }
                });
            }

            if (errors.length > 0) {
                res.error = createError(errors);
            }

            return res;
        },
        subValidators: {
            contains: (value: string, checkedValue: string) => {
                const valid = !!~value.indexOf(checkedValue);

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.string.CONTAINS_VALIDATION_FAILED(checkedValue, value)
                };
            },
            minLength: (value: string, length: string) => {
                const valid = value.length > Number(length);

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.string.MIN_LENGTH_VALIDATION_FAILED(length, value)
                };
            },
            maxLength: (value: string, length: string) => {
                const valid = value.length < Number(length);

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.string.MIN_LENGTH_VALIDATION_FAILED(length, value)
                };
            }
        }
    },
    number: {
        validate(value: any, validators: StateArguments, resolveParam: (s: string) => string) {
            const res: StateResult = {
                res: value,
                error: null
            };
            const errors: string[] = [];

            const isNumber = !isNaN(value);
            if (value !== 0 && !isNumber) {
                errors.push(validationErrors.number.NUMBER_TYPE_VALIDATION_FAILED(value));
            }

            if (validators.length > 0) {
                validators.map(validatorMeta => {
                    const firstArg = validators[0];

                    if (typeof validatorMeta === 'object') {
                        const subValidator = this.subValidators[validatorMeta.name];
                        if (subValidator) {
                            const validationRes = subValidator(value, resolveParam(validatorMeta.args[0]));
                            if (validationRes.error) {
                                errors.push(validationRes.error);
                            }
                        } else {
                            // push missing sub validator
                        }
                    }
                });
            }

            if (errors.length > 0) {
                res.error = createError(errors);
            }

            return res;
        },
        subValidators: {
            min: (value: string, minValue: string) => {
                const valid = Number(value) > Number(minValue);

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.number.MIN_VALIDATION_FAILED(value, minValue)
                };
            },
            max: (value: string, maxValue: string) => {
                const valid = Number(value) < Number(maxValue);

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.number.MAX_VALIDATION_FAILED(value, maxValue)
                };
            },
            multipleOf: (value: string, multipleOf: string) => {
                const valid = Number(value) % Number(multipleOf) === 0;

                return {
                    res: value,
                    error: valid ?
                        null :
                        validationErrors.number.MULTIPLE_OF_VALIDATION_FAILED(value, multipleOf)
                };
            }
        }
    }
};
