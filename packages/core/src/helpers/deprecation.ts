/**
 * add get/set on an object with a deprecation warning when setting a value
 */
const valueMaps: Record<string, WeakMap<any, any>> = {};
const valueOnThisPrefix = `__deprecateFromStylable-`;
export function setFieldForDeprecation(
    object: object,
    fieldName: string,
    options: {
        objectType?: string;
        pleaseUse?: string;
        enumerable?: boolean;
        valueOnThis?: boolean;
    } = {}
) {
    const objectPrefix = options.objectType ? options.objectType + `.` : ``;
    const alternative = options.pleaseUse ? `, please use ${options.pleaseUse}` : ``;
    const enumerable = options.enumerable || false;
    const fieldOnThis = options.valueOnThis ? `${valueOnThisPrefix}${fieldName}` : ``;
    if (!fieldOnThis && !valueMaps[fieldName]) {
        valueMaps[fieldName] = new WeakMap();
    }
    Object.defineProperty(object, fieldName, {
        configurable: true,
        get() {
            warnOnce(`"${objectPrefix}${fieldName}" is deprecated${alternative}`);
            return fieldOnThis ? this[fieldOnThis] : valueMaps[fieldName].get(this);
        },
        set(newValue) {
            if (fieldOnThis) {
                this[fieldOnThis] = newValue;
            } else {
                valueMaps[fieldName].set(this, newValue);
            }
            return newValue;
        },
        enumerable,
    });
}

export function wrapFunctionForDeprecation<FUNC extends (this: any, ...args: any[]) => any>(
    func: FUNC,
    options: {
        name: string;
        pleaseUse?: string;
    }
): FUNC {
    const alternative = options.pleaseUse ? `, please use ${options.pleaseUse}` : ``;
    const warning = `"${options.name || func.name}" is deprecated${alternative}`;
    return function (this: any, ...args: any[]) {
        warnOnce(warning);
        return func.apply(this, args);
    } as FUNC;
}

/**
 * console warn once per message
 */
const warnsFlag: Record<string, boolean> = {};
let isWarnOn = true;
export function warnOnce(warning: string) {
    if (isWarnOn && !warnsFlag[warning]) {
        warnsFlag[warning] = true;
        console.warn(warning);
    }
}

/**
 * prevent deprecation warn calls during action
 * @param action to be called with no deprecation warnings
 * @returns return value of action
 */
export function ignoreDeprecationWarn<T extends () => any>(action: T): ReturnType<T> {
    isWarnOn = false;
    try {
        return action();
    } finally {
        isWarnOn = true;
    }
}
