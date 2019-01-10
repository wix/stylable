const Dependency = require('webpack/lib/Dependency');

class StyleableAutoInitDependency extends Dependency {
    constructor(runtimeRendererModule, runtimeTemplate, module) {
        super();
        this.module = module;
        this.runtimeTemplate = runtimeTemplate;
        this.runtimeRendererModule = runtimeRendererModule;
        this.type = 'StyleableAutoInitDependency';
        this.range = 0;
        this.requireWebpackRequire = true;
    }
    updateHash(hash) {
        hash.update(this.type + '');
        hash.update(String((this.runtimeRendererModule && this.runtimeRendererModule.id) || ''));
    }
}

class StyleableAutoInitDependencyTemplate {
    apply(dep, source) {
        const renderingCode = [];
        const id = dep.runtimeTemplate.moduleId({
            module: dep.runtimeRendererModule,
            request: dep.runtimeRendererModule.request
        });
        renderingCode.push(`var $renderer = __webpack_require__(${id}).$;`);
        renderingCode.push(`if(typeof window !== 'undefined') { $renderer.init(window); }`);
        source.insert(0, renderingCode.join('\n'));
    }
}
exports.StyleableAutoInitDependency = StyleableAutoInitDependency;
exports.StyleableAutoInitDependencyTemplate = StyleableAutoInitDependencyTemplate;
