import type { StylableExports } from '@stylable/core';

interface InjectCSSOptions {
    /**
     *  omitting the id will fallback to module.id/import.meta.url
     */
    id?: string | undefined;
    /**
     * css string to inject
     */
    css: string;
    /**
     *  calculated style depth
     */
    depth: number | string;
    /**
     *  reconciliation will happen only for style with the same runtimeId
     */
    runtimeId: string;
}

interface ModuleOptions {
    /**
     * module namespace
     */
    namespace: string;
    /**
     * static imports for the module
     */
    imports?: Array<{ from: string }>;
    /**
     * Stylable transforms exports
     */
    jsExports: StylableExports | { [K in keyof StylableExports]: string };
    /**
     * the request of the module runtime api e.g @stylable/runtime
     */
    runtimeRequest?: string;
    /**
     * target module format
     */
    moduleType: 'esm' | 'cjs';
    /**
     * es3 compat mode
     */
    varType?: 'const' | 'var';
    /**
     * inject code immediately after imports 
     */
    header?: string;
    /**
     * inject code after the entire module code
     */
    footer?: string;
}

export function generateStylableJSModuleSource(
    moduleOptions: ModuleOptions,
    injectOptions?: InjectCSSOptions
) {
    const {
        namespace,
        imports = [],
        jsExports,
        moduleType,
        runtimeRequest,
        varType = 'const',
        header = '',
        footer = '',
    } = moduleOptions;

    const { classes, keyframes, layers, stVars, vars } = jsExports;
    const exportKind = moduleType === 'esm' ? `export ${varType} ` : 'module.exports.';
    return `
${imports.map(moduleRequest(moduleType)).join('\n')}
${runtimeImport(moduleType, runtimeRequest, injectOptions)}

${header}

${varType} _namespace_ = ${JSON.stringify(namespace)};
${varType} _style_ = /*#__PURE__*/ classesRuntime.bind(null, _namespace_);

${exportKind}cssStates = /*#__PURE__*/ statesRuntime.bind(null, _namespace_);
${exportKind}style = /*#__PURE__*/ _style_;
${exportKind}st = /*#__PURE__*/ _style_;

${exportKind}namespace = _namespace_;
${exportKind}classes = ${JSON.stringify(classes)};
${exportKind}keyframes = ${JSON.stringify(keyframes)}; 
${exportKind}layers = ${JSON.stringify(layers)};
${exportKind}stVars = ${JSON.stringify(stVars)}; 
${exportKind}vars = ${JSON.stringify(vars)}; 

${runtimeExecuteInject(moduleType, injectOptions)}

${footer}
`;
}

function moduleRequest(moduleType: 'esm' | 'cjs') {
    return (moduleRequest: { from: string }) => {
        const request = JSON.stringify(moduleRequest.from);
        return moduleType === 'esm' ? `import ${request};` : `require(${request});`;
    };
}

function runtimeImport(
    moduleType: 'esm' | 'cjs',
    runtimeRequest: string | undefined,
    injectOptions: InjectCSSOptions | undefined
) {
    const importInjectCSS = injectOptions?.css ? `, injectCSS` : '';
    const request = JSON.stringify(
        runtimeRequest ??
            // TODO: we use direct requests here since we don't know how this will be resolved
            (moduleType === 'esm' ? '@stylable/runtime/esm/runtime' : '@stylable/runtime/dist/runtime')
    );
    return moduleType === 'esm'
        ? `import { classesRuntime, statesRuntime${importInjectCSS} } from ${request};`
        : `const { classesRuntime, statesRuntime${importInjectCSS} } = require(${request});`;
}

function runtimeExecuteInject(moduleType: 'esm' | 'cjs', injectOptions: InjectCSSOptions | undefined) {
    if (!injectOptions?.css) {
        return '';
    }
    const { id, css, depth, runtimeId } = injectOptions;

    let out = 'injectCSS(';
    out += id ? JSON.stringify(id) : moduleType === 'esm' ? 'import.meta.url' : 'module.id';
    out += ', ';
    out += JSON.stringify(css);
    out += ', ';
    out += JSON.stringify(depth);
    out += ', ';
    out += JSON.stringify(runtimeId);
    out += ');';
    return out;
}
