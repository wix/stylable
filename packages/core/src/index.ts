export { Stylable, StylableConfig } from './stylable.js';
export { Diagnostics, Diagnostic, DiagnosticSeverity } from './diagnostics.js';
export type {
    StylableSymbol,
    ClassSymbol,
    ImportSymbol,
    ElementSymbol,
    CSSVarSymbol,
    VarSymbol,
    Imported,
    KeyframesSymbol,
    MixinReflection,
    ComputedStVar,
    FlatComputedStVar,
} from './features/index.js';
export { StylableMeta } from './stylable-meta.js';
export type { CSSResolve, JSResolve, CSSResolvePath } from './stylable-resolver.js';
export type { CSSDependency, JSDependency, Dependency } from './visit-meta-css-dependencies.js';
export type { StylableResults, RuntimeStVar } from './stylable-transformer.js';

// utils
export type { MinimalFS } from './cached-process-file.js';
export { noCollisionNamespace } from './resolve-namespace-factories.js';
export {
    createNamespaceStrategy,
    defaultNoMatchHandler,
    defaultNamespaceBuilder,
    CreateNamespaceOptions,
    NamespaceBuilder,
    NamespaceBuilderParams,
    PackageInfo,
} from './helpers/namespace.js';
export { processNamespace } from './stylable-processor.js';
export { CustomValueStrategy, createCustomValue, type JSValueExtension } from './custom-values.js';
export { createDefaultResolver } from './module-resolver.js';

// low-level api
export { parseModuleImportStatement, ensureModuleImport } from './helpers/import.js';
export { validateCustomPropertyName } from './helpers/css-custom-property.js';

export { generateStylableJSModuleSource } from './stylable-js-module-source.js';
