import type * as postcss from 'postcss';

export type DiagnosticType = 'error' | 'warning' | 'info';

export interface DiagnosticBase {
    severity: DiagnosticType;
    message: string;
    code: string;
}

export interface DiagnosticContext {
    node: postcss.Node;
    options?: DiagnosticOptions;
    filePath?: string;
}

export interface DiagnosticOptions {
    word?: string;
}

export type Diagnostic = DiagnosticBase & DiagnosticContext;

export type DiagnosticsBank = Record<string, (...args: any[]) => DiagnosticBase>;

export class Diagnostics {
    constructor(public reports: Diagnostic[] = []) {}
    public report(diagnostic: DiagnosticBase, context: DiagnosticContext) {
        const node = context.node;
        this.reports.push({
            options: {}, // todo: do we really need this?
            filePath: node.source?.input.from,
            ...diagnostic,
            ...context,
        });
    }

    private add2(
        severity: DiagnosticType,
        node: postcss.Node,
        message: string,
        options: DiagnosticOptions = {}
    ) {
        this.reports.push({
            code: 'x',
            filePath: '',
            message,
            node,
            severity,
            options,
        });
    }

    public error(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add2('error', node, message, options);
    }
    public warn(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add2('warning', node, message, options);
    }
    public info(node: postcss.Node, message: string, options?: DiagnosticOptions) {
        this.add2('info', node, message, options);
    }
}
