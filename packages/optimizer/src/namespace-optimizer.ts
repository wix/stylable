import { IStylableNamespaceOptimizer, StylableMeta } from '@stylable/core';
import { basename } from 'path';

export class StylableNamespaceOptimizer implements IStylableNamespaceOptimizer {
    public index: number;
    public namespacePrefix: string;
    public namespaceMapping: Record<string, string>;
    constructor() {
        this.index = 0;
        this.namespacePrefix = 'o';
        this.namespaceMapping = {};
    }
    public getNamespace(meta: StylableMeta, ..._env: any[]) {
        if (basename(meta.source) === 'gallery.st.css' && this.index === 2) {
            console.log(meta.source, this.index, new Error().stack)
        }
        if (basename(meta.source) === 'button.st.css' && this.index === 3) {
            console.log(meta.source, this.index, new Error().stack)
        }

        return (
            this.namespaceMapping[meta.source] ||
            (this.namespaceMapping[meta.source] = this.namespacePrefix + this.index++)
        );
    }
}
