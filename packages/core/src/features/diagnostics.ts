import { createDiagnosticReporter } from '../diagnostics';

export const generalDiagnostics = {
    INVALID_FUNCTIONAL_SELECTOR: createDiagnosticReporter(
        '00001',
        'error',
        (selector: string, type: string) => `"${selector}" ${type} is not functional`
    ),
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: createDiagnosticReporter(
        '05014',
        'error',
        (name: string) => `cannot define "${name}" inside a complex selector`
    ),
};
