import type { DiagnosticType } from '@stylable/core';
import { levels, Log } from './logger';

export interface Diagnostic {
    message: string;
    type: DiagnosticType;
    offset?: number;
}

export type DiagnosticMessages = Map<string, Diagnostic[]>;

export function reportDiagnostics(
    log: Log,
    diagnosticsMessages: DiagnosticMessages,
    diagnosticsMode?: string
) {
    let message = '[Stylable Diagnostics]';
    for (const [filePath, diagnostics] of diagnosticsMessages.entries()) {
        message += `\n[${filePath}]\n${diagnostics
            .sort(({ offset: a = 0 }, { offset: b = 0 }) => a - b)
            .map(({ type, message }) => `[${type}]: ${message}`)
            .join('\n')}`;
    }

    log(message, levels.info);

    return diagnosticsMode === 'strict' && hasErrorOrWarning(diagnosticsMessages);
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
