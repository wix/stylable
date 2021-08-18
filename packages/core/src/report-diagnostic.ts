import type { Diagnostic } from './diagnostics';
import type { StylableMeta } from './stylable-processor';

export interface EmitDiagnosticsContext {
    emitError(e: Error): void;
    emitWarning(e: Error): void;
}

export type DiagnosticsMode = 'auto' | 'strict' | 'loose';
/**
 * Helper function to report diagnostics for every diagnosticsMode
 */
function reportDiagnostic(
    ctx: EmitDiagnosticsContext,
    diagnosticsMode: DiagnosticsMode,
    { message, type }: { message: string; type: 'warning' | 'error' }
) {
    const error = new Error(message);
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
        if (diagnostic.type !== 'info') {
            reportDiagnostic(ctx, diagnosticsMode, diagnostic);
        }
    }
}
