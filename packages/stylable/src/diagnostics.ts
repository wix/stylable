import * as postcss from 'postcss';

export type DiagnosticType = 'error' | 'warning';

export interface Diagnostic {
    type: DiagnosticType;
    node: postcss.Node;
    message: string;
}

export class Diagnostics {
    reports: Diagnostic[] = [];
    add(type: DiagnosticType, node: postcss.Node, message: string){
        this.reports.push({ type, node, message });
    }
    error(node: postcss.Node, message: string) {
        this.add('error', node, message);
    }
    warning(node: postcss.Node, message: string) {
        this.add('warning', node, message);
    }
}