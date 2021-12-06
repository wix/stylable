import { Diagnostic, DiagnosticMessages, reportDiagnostics } from './report-diagnostics';

export type DiagnosticsMode = 'strict' | 'loose';

interface ProcessDiagnostics {
    diagnostics: Diagnostic[];
    diagnosticsMode?: DiagnosticsMode | undefined;
}

type diagnosticsStore = Map<string, Map<string, ProcessDiagnostics>>;

export class DiagnosticsManager {
    protected store!: diagnosticsStore;

    constructor() {
        this.clear();
    }

    public report() {
        let diagnosticMode: DiagnosticsMode = 'loose';
        const diagnosticMessages: DiagnosticMessages = new Map();
        const existingDiagnostics = [...this.store.values()].flatMap((processDiagnostics) => [
            ...processDiagnostics.entries(),
        ]);

        for (const [
            filepath,
            { diagnostics, diagnosticsMode: currentMode },
        ] of existingDiagnostics) {
            if (diagnosticMode !== 'strict') {
                diagnosticMode = currentMode || diagnosticMode;
            }

            diagnosticMessages.set(filepath, diagnostics);
        }

        reportDiagnostics(diagnosticMessages, true, diagnosticMode);
    }

    public set(
        identifier: string,
        filepath?: string,
        processDiagnostics?: ProcessDiagnostics
    ): void {
        if (this.store.has(identifier) && filepath && processDiagnostics) {
            this.store.get(identifier)!.set(filepath, processDiagnostics);
        } else {
            this.store.set(
                identifier,
                new Map(
                    filepath && processDiagnostics ? [[filepath, processDiagnostics]] : undefined
                )
            );
        }
    }

    public get(identifier: string): Map<string, ProcessDiagnostics> | undefined;
    public get(identifier: string, filepath: string): ProcessDiagnostics | undefined;
    public get(identifier: string, filepath?: string) {
        if (filepath) {
            return this.store.get(identifier)?.get(filepath);
        } else {
            return this.store.get(identifier);
        }
    }

    public delete(identifier: string, filepath?: string) {
        if (filepath) {
            this.store.get(identifier)?.delete(filepath);
        } else {
            this.store.delete(identifier);
        }
    }

    public clear() {
        this.store = new Map();
    }
}
