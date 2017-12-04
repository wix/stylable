import * as postcss from 'postcss';
export declare type DiagnosticType = 'error' | 'warning';
export interface Diagnostic {
    type: DiagnosticType;
    node: postcss.Node;
    message: string;
    options: postcss.NodeErrorOptions;
}
export declare class Diagnostics {
    reports: Diagnostic[];
    constructor(reports?: Diagnostic[]);
    add(type: DiagnosticType, node: postcss.Node, message: string, options?: postcss.NodeErrorOptions): void;
    error(node: postcss.Node, message: string, options?: postcss.NodeErrorOptions): void;
    warn(node: postcss.Node, message: string, options?: postcss.NodeErrorOptions): void;
}
