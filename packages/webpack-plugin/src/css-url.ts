import { Dependency, sources } from 'webpack';

const makeSerializable = require('webpack/lib/util/makeSerializable');
const ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

export class CSSURLDependency extends ModuleDependency {
    constructor(request: string) {
        super(request);
    }

    get type() {
        return 'url()';
    }

    get category() {
        return 'url';
    }
}

export class CSSURLDependencyTemplate extends ModuleDependency.Template {
    apply(_dependency: Dependency, _source: sources.ReplaceSource, _templateContext: any) {
        /** */
    }
}

makeSerializable(CSSURLDependency, __filename, CSSURLDependency);
