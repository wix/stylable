import type { DiagnosticType } from '@stylable/core';

export interface Diagnostic {
    message: string;
    type: DiagnosticType;
}

export type DiagnosticMessages = Map<string, Diagnostic[]>;

function report(diagnosticsMessages: DiagnosticMessages) {
    console.log('[Stylable Diagnostics]');
    for (const [filePath, diagnostics] of diagnosticsMessages.entries()) {
        console.log(
            `[${filePath}]\n`,
            diagnostics.map(({ type, message }) => `[${type}]: ${message}`).join('\n\n')
        );
    }
}

export function reportDiagnostics(
    diagnosticsMessages: DiagnosticMessages,
    diagnostics?: boolean,
    diagnosticsMode?: string
) {
    if (!diagnosticsMessages.size) {
        return;
    }

    if (diagnostics) {
        report(diagnosticsMessages);
    }

    if (diagnosticsMode === 'strict' && hasErrorOrWarning(diagnosticsMessages)) {
        process.exitCode = 1;
    }
}

function hasErrorOrWarning(diagnosticsMessages: DiagnosticMessages) {
    for (const diagnostics of diagnosticsMessages.values()) {
        const has = diagnostics.some(
            (diagnostic) => diagnostic.type === 'error' || diagnostic.type === 'warning'
        );

        if (has) {
            return true;
        }
    }

    return false;
}
