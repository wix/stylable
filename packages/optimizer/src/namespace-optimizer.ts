import { IStylableNamespaceOptimizer, Pojo, StylableMeta } from '@stylable/core';

export class StylableNamespaceOptimizer implements IStylableNamespaceOptimizer {
    public index: number;
    public namespacePrefix: string;
    public namespaceMapping: Pojo<string>;
    constructor() {
        this.index = 0;
        this.namespacePrefix = 'o';
        this.namespaceMapping = {};
    }
    public getNamespace(meta: StylableMeta, ..._env: any[]) {
        return (
            this.namespaceMapping[meta.source] ||
            (this.namespaceMapping[meta.source] = this.namespacePrefix + this.index++)
        );
    }
}
