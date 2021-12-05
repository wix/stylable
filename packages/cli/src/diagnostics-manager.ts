import { Diagnostic, DiagnosticMessages, reportDiagnostics } from './report-diagnostics';

export type DiagnosticsMode = 'strict' | 'loose';

interface ProcessDiagnostics {
    diangostics: Diagnostic[];
    diagnosticMode?: DiagnosticsMode | undefined;
}

type DiangosticsStore = Map<string, Map<string, ProcessDiagnostics>>;

export class DiagnosticsManager {
    protected store!: DiangosticsStore;

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
            { diangostics, diagnosticMode: currentMode },
        ] of existingDiagnostics) {
            if (diagnosticMode !== 'strict') {
                diagnosticMode = currentMode || diagnosticMode;
            }

            diagnosticMessages.set(filepath, diangostics);
        }

        reportDiagnostics(diagnosticMessages, true, diagnosticMode);
    }

    public set(
        identifier: string,
        filepath?: string,
        existingDiagnostic?: ProcessDiagnostics
    ): void {
        if (this.store.has(identifier) && filepath && existingDiagnostic) {
            this.store.get(identifier)!.set(filepath, existingDiagnostic);
        } else {
            this.store.set(
                identifier,
                new Map(
                    filepath && existingDiagnostic ? [[filepath, existingDiagnostic]] : undefined
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
