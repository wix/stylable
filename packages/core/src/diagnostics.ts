import type * as postcss from 'postcss';

export interface DiagnosticOptions {
    word?: string;
}

export class Diagnostics {
    constructor(public reports: Diagnostic[] = []) {}
    public add(
        type: DiagnosticType,
        node: postcss.Node,
        message: string,
        options: DiagnosticOptions = {}
    ) {
        this.reports.push({ type, node, message, options });
    }
    public error(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add('error', node, message, options);
    }
    public warn(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add('warning', node, message, options);
    }
    public info(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add('info', node, message, options);
    }
}

interface DiagnosticBase {
    node: postcss.Node;
    message: string;
    options: DiagnosticOptions;
}

interface ErrorDiagnostic extends DiagnosticBase {
    type: 'error';
}

interface WarningDiagnostic extends DiagnosticBase {
    type: 'warning';
}

interface InfoDiagnostic extends DiagnosticBase {
    type: 'info';
}

export type Diagnostic = ErrorDiagnostic | WarningDiagnostic | InfoDiagnostic;

export type DiagnosticType = Diagnostic['type'];
