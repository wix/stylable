export const generalDiagnostics = {
    INVALID_FUNCTIONAL_SELECTOR(selector: string, type: string) {
        return `"${selector}" ${type} is not functional`;
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) {
        return `cannot define "${name}" inside a complex selector`;
    },
};
