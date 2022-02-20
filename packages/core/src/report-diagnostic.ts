import type { Diagnostic, DiagnosticType } from './diagnostics';
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
    { message, type }: { message: string; type: DiagnosticType },
    from?: string
) {
    const error = new Error(from ? `[${from}]:\n\n${message}` : message);

    if (type === 'info') {
        ctx.emitWarning(error);

        return;
    }

    if (diagnosticsMode === 'auto') {
        if (type === 'warning') {
            ctx.emitWarning(error);
        } else if (type === 'error') {
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
    diagnosticsMode: DiagnosticsMode
) {
    meta.diagnostics?.reports.forEach(handleReport);
    meta.transformDiagnostics?.reports.forEach(handleReport);

    function handleReport(diagnostic: Diagnostic) {
        reportDiagnostic(ctx, diagnosticsMode, diagnostic);
    }
}
