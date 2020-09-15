import * as postcss from 'postcss';

export type DiagnosticType = 'error' | 'warning';

export interface DiagnosticOptions {
    word?: string;
}

export interface Diagnostic {
    type: DiagnosticType;
    node: postcss.Node;
    message: string;
    options: DiagnosticOptions;
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
}
