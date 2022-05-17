import type { Diagnostic } from './diagnostics';
import type { StylableMeta } from './stylable-meta';

export interface EmitDiagnosticsContext {
    emitError(e: Error): void;
    emitWarning(e: Error): void;
}

export type DiagnosticsMode = 'auto' | 'strict' | 'loose';
/**
 * Helper function to report diagnostics for every diagnosticsMode
 */
export function reportDiagnostic(
    ctx: EmitDiagnosticsContext,
    diagnosticsMode: DiagnosticsMode,
    { code, message, severity }: Diagnostic,
    from?: string
) {
    const messageToPrint = `[${severity}: ${code}]: ${message}`;
    const error = new Error(from ? `[${from}]:\n\n${messageToPrint}` : messageToPrint);

    if (severity === 'info') {
        ctx.emitWarning(error);

        return;
    }

    if (diagnosticsMode === 'auto') {
        if (severity === 'warning') {
            ctx.emitWarning(error);
        } else if (severity === 'error') {
            ctx.emitError(error);
        }
    } else if (diagnosticsMode === 'strict') {
        ctx.emitError(error);
    } else if (diagnosticsMode === 'loose') {
        ctx.emitWarning(error);
    }
}
export function emitDiagnostics(
    ctx: EmitDiagnosticsContext,
    meta: StylableMeta,
    diagnosticsMode: DiagnosticsMode,
    filePath?: string
) {
    meta.diagnostics?.reports.forEach(handleReport);
    meta.transformDiagnostics?.reports.forEach(handleReport);

    function handleReport(diagnostic: Diagnostic) {
        reportDiagnostic(ctx, diagnosticsMode, diagnostic, filePath);
    }
}
