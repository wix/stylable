import { WEBPACK_STYLABLE } from './runtime-dependencies';

const Dependency = require('webpack/lib/Dependency');

export class StyleableAutoInitDependency extends Dependency {
    public range = 0;
    public requireWebpackRequire = true;
    public type = 'StyleableAutoInitDependency';

    constructor(public module: any, public globalInjection?: (code: string) => string) {
        super();
    }
    public updateHash(hash: any) {
        hash.update(this.type + '');
    }
}

export class StyleableAutoInitDependencyTemplate {
    public apply(_dep: any, source: any, _runtimeTemplate: any) {
        const renderingCode = [];

        if ((this as any)._globalInjection) {
            renderingCode.push((this as any)._globalInjection(`${WEBPACK_STYLABLE}.$`));
        }

        renderingCode.push(
            `if(typeof window !== 'undefined') { ${WEBPACK_STYLABLE}.$.init(window); }`
        );
        source.insert(0, renderingCode.join('\n'));
    }
}
