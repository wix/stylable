import type * as postcss from 'postcss';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticBase {
    severity: DiagnosticSeverity;
    message: string;
    code: string;
}

export interface DiagnosticContext {
    node: postcss.Node;
    word?: string;
    filePath?: string;
}

export interface DiagnosticOptions {
    word?: string;
}

export type Diagnostic = DiagnosticBase & DiagnosticContext;

export class Diagnostics {
    constructor(public reports: Diagnostic[] = []) {}
    public report(diagnostic: DiagnosticBase, context: DiagnosticContext) {
        const node = context.node;
        this.reports.push({
            filePath: node.source?.input.from,
            ...diagnostic,
            ...context,
        });
    }
}

export function createDiagnosticReporter<T extends any[]>(
    code: string,
    severity: DiagnosticSeverity,
    message: (...args: T) => string
) {
    const func = (...args: T): DiagnosticBase => {
        return { code, severity, message: message(...args) };
    };

    func.code = code;
    func.severity = severity;

    return func;
}
