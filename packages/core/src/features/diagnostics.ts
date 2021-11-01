export const generalDiagnostics = {
    INVALID_FUNCTIONAL_SELECTOR(selector: string, type: string) {
        return `"${selector}" ${type} is not functional`;
    },
};
