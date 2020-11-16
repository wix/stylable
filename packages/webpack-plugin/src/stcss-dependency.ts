import { Dependency, sources } from 'webpack';

const makeSerializable = require('webpack/lib/util/makeSerializable');
const ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

export class UnusedDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
        this.weak = true;
    }

    get type() {
        return '@st-unused-import';
    }
}

export class UnusedDependencyTemplate extends ModuleDependency.Template {
    apply(_dependency: Dependency, _source: sources.ReplaceSource, _templateContext: any) {
        /** */
    }
}

makeSerializable(UnusedDependency, __filename, UnusedDependency.name);
