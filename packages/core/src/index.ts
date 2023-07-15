export { Stylable, StylableConfig } from './stylable';
export { Diagnostics, Diagnostic, DiagnosticSeverity } from './diagnostics';
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
} from './features';
export { StylableMeta } from './stylable-meta';
export type { CSSResolve, JSResolve } from './stylable-resolver';
export type { CSSDependency, JSDependency, Dependency } from './visit-meta-css-dependencies';
export type { StylableResults, RuntimeStVar } from './stylable-transformer';

// utils
export type { MinimalFS } from './cached-process-file';
export { noCollisionNamespace } from './resolve-namespace-factories';
export {
    createNamespaceStrategy,
    defaultNoMatchHandler,
    defaultNamespaceBuilder,
    CreateNamespaceOptions,
    NamespaceBuilder,
    NamespaceBuilderParams,
    PackageInfo,
} from './helpers/namespace';
export { processNamespace } from './stylable-processor';
export { CustomValueStrategy, createCustomValue } from './custom-values';
export { createDefaultResolver } from './module-resolver';

// low-level api
export { parseModuleImportStatement, ensureModuleImport } from './helpers/import';
export { validateCustomPropertyName } from './helpers/css-custom-property';

export { generateStylableJSModuleSource } from './stylable-js-module-source';
