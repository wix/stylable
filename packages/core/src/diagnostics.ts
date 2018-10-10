import * as postcss from 'postcss';

export type DiagnosticType = 'error' | 'warning';

export interface Diagnostic {
    type: DiagnosticType;
    node: postcss.Node;
    message: string;
    options: postcss.NodeErrorOptions;
}

export class Diagnostics {
    constructor(public reports: Diagnostic[] = []) {}
    public add(type: DiagnosticType, node: postcss.Node, message: string, options: postcss.NodeErrorOptions = {}) {
        this.reports.push({type, node, message, options});
    }
    public error(node: postcss.Node, message: string, options?: postcss.NodeErrorOptions) {
        this.add('error', node, message, options);
    }
    public warn(node: postcss.Node, message: string, options?: postcss.NodeErrorOptions) {
        this.add('warning', node, message, options);
    }
}
