export function isEqual(value1: any, value2: any): boolean {
    if (value1 === null || value2 === null) {
        return value1 === value2;
    }

    if (Array.isArray(value1) && Array.isArray(value2)) {
        if (value1.length !== value2.length) {
            return false;
        }

        for (let i = 0; i < value1.length; i++) {
            if (!isEqual(value1[i], value2[i])) {
                return false;
            }
        }

        return true;
    }

    if (typeof value1 === 'object' && typeof value2 === 'object') {
        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);

        if (keys1.length !== keys2.length) {
            return false;
        }

        for (const key of keys1) {
            if (!isEqual(value1[key], value2[key])) {
                return false;
            }
        }

        return true;
    }

    return value1 === value2;
}
