const Dependency = require('webpack/lib/Dependency');
const { WEBPACK_STYLABLE } = require('./runtime-dependencies');

export class StyleableAutoInitDependency extends Dependency {
    private range = 0;
    private type = 'StyleableAutoInitDependency';
    private requireWebpackRequire = true;
    constructor(private module: any, private globalInjection: (code: string) => string) {
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
