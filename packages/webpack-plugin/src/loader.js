const path = require('path');
module.exports = function(source) {
  
    const stylable = this.getStyleablePlugin().stylable;
    const { meta, exports } = stylable.createTransformer().transform(stylable.process(this.resource));
    const assetsImports = meta.urls.filter(url => isAsset(url)).map((asset, i) => {
        const absPath = makeAbsolute(
            asset,
            this.rootContext,
            path.dirname(currentModule.resource)
        );
        return `import asset_${i}_ from "${absPath}";`;
    });
    const imports = meta.imports.map((symbol, i) => {
        this.addDependency(symbol.fromRelative);
        // return `var style_${i}_ = import(/* webpackMode: "eager" */${JSON.stringify(symbol.fromRelative)});`;
        // return `import ${symbol.defaultExport || `style_${i}_`} from "${symbol.fromRelative}";`;
    });
    
    // root: string,
    // namespace: string,
    // locals: Partial<RuntimeStylesheet>,
    // css: string,
    // depth: number,
    // id: string | number,
    // cssDeps: RuntimeStylesheet[]

    return `
    ${assetsImports.join('\n')}
    ${[].join('\n')}
    import {create, $} from "@stylable/runtime";
    export default create(
      ${JSON.stringify(meta.root)}, 
      ${JSON.stringify(meta.namespace)}, 
      ${JSON.stringify(exports)}, 
      null, 
      0, 
      ${JSON.stringify(this.resource)}, 
      []);
    `;
};
