import { Diagnostic, DiagnosticMessages, reportDiagnostics } from './report-diagnostics';

export type DiagnosticsMode = 'strict' | 'loose';

interface ProcessDiagnostics {
    diagnostics: Diagnostic[];
    diagnosticsMode?: DiagnosticsMode | undefined;
}

type DiagnosticsStore = Map<string, Map<string, ProcessDiagnostics>>;

export class DiagnosticsManager {
    private store: DiagnosticsStore = new Map();

    public clear() {
        this.store = new Map();
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

    public report() {
        let diagnosticMode: DiagnosticsMode = 'loose';
        const diagnosticMessages: DiagnosticMessages = new Map();
        const collectedDiagnostics = new Map<string, Map<string, Diagnostic>>();

        for (const buildDiagnostics of this.store.values()) {
            for (const [
                filePath,
                { diagnostics, diagnosticsMode: currentMode },
            ] of buildDiagnostics) {
                if (diagnosticMode !== 'strict') {
                    diagnosticMode = currentMode || diagnosticMode;
                }

                if (!diagnosticMessages.has(filePath)) {
                    diagnosticMessages.set(filePath, []);
                    collectedDiagnostics.set(filePath, new Map());
                }

                const currentDiagnostics = diagnosticMessages.get(filePath)!;
                const ids = collectedDiagnostics.get(filePath)!;

                for (const diagnostic of diagnostics) {
                    const diagnosticId = `${diagnostic.type};${diagnostic.message}`;
                    if (!ids.has(diagnosticId)) {
                        ids.set(diagnosticId, diagnostic);
                        currentDiagnostics.push(ids.get(diagnosticId)!);
                    }
                }
            }
        }

        reportDiagnostics(diagnosticMessages, true, diagnosticMode);
    }
}
