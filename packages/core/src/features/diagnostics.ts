import type { DiagnosticBase } from '../diagnostics';

export const generalDiagnostics = {
    INVALID_FUNCTIONAL_SELECTOR(selector: string, type: string): DiagnosticBase {
        return {
            code: '00001',
            message: `"${selector}" ${type} is not functional`,
            severity: 'error',
        };
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) {
        return `cannot define "${name}" inside a complex selector`;
    },
};
