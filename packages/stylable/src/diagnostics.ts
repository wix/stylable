import * as postcss from 'postcss';


export class Diagnostics {
    errors: { node: postcss.Node, message: string }[] = [];
    warnings: { node: postcss.Node, message: string }[] = [];
    error(node: postcss.Node, message: string) {
        this.errors.push({ node, message });
    }
    warning(node: postcss.Node, message: string) {
        this.warnings.push({ node, message });
    }
}