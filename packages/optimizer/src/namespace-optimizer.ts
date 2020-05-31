import { IStylableNamespaceOptimizer, StylableMeta } from '@stylable/core';

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
        return (
            this.namespaceMapping[meta.namespace] ||
            (this.namespaceMapping[meta.namespace] = this.namespacePrefix + this.index++)
        );
    }
}
