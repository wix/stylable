/**
 * sorts by depth, falling back to alpha numeric
 */
export function sortModulesByDepth<T>(
    modules: Array<T>,
    getDepth: (m: T) => number,
    getID: (m: T) => string,
    factor = 1
) {
    return modules.sort((m1, m2) => {
        const depthDiff = getDepth(m2) - getDepth(m1);
        if (depthDiff === 0) {
            const m1Id = getID(m1);
            const m2Id = getID(m2);
            if (m1Id > m2Id) {
                return 1;
            } else if (m1Id < m2Id) {
                return -1;
            } else {
                return 0;
            }
        } else {
            return depthDiff * factor;
        }
    });
}
