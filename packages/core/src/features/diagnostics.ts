import type { DiagnosticBase, DiagnosticsBank } from '../diagnostics';

export const generalDiagnostics: DiagnosticsBank = {
    INVALID_FUNCTIONAL_SELECTOR(selector: string, type: string): DiagnosticBase {
        return {
            code: '00001',
            message: `"${selector}" ${type} is not functional`,
            severity: 'error',
        };
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(name: string) {
        return {
            code: '05014',
            message: `cannot define "${name}" inside a complex selector`,
            severity: 'error',
        };
    },
};
