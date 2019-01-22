const Dependency = require('webpack/lib/Dependency');
const { WEBPACK_STYLABLE } = require('./runtime-dependencies');

class StyleableAutoInitDependency extends Dependency {
    constructor(module, globalInjection) {
        super();
        this.module = module;
        this.type = 'StyleableAutoInitDependency';
        this.range = 0;
        this.requireWebpackRequire = true;
        this._globalInjection = globalInjection;
    }
    updateHash(hash) {
        hash.update(this.type + '');
    }
}

class StyleableAutoInitDependencyTemplate {
    apply(dep, source, runtimeTemplate) {
        const renderingCode = [];

        if (this._globalInjection) {
            renderingCode.push(this._globalInjection(`${WEBPACK_STYLABLE}.$`));
        }

        renderingCode.push(
            `if(typeof window !== 'undefined') { ${WEBPACK_STYLABLE}.$.init(window); }`
        );
        source.insert(0, renderingCode.join('\n'));
    }
}
exports.StyleableAutoInitDependency = StyleableAutoInitDependency;
exports.StyleableAutoInitDependencyTemplate = StyleableAutoInitDependencyTemplate;
