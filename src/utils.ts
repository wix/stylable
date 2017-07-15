
export function hasKeys(o: {}) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return true;
        }
    }
    return false;
}


export const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
