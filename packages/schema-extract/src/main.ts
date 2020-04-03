import {
    ClassSymbol,
    ElementSymbol,
    getCssDocsForSymbol,
    ImportSymbol,
    MappedStates,
    safeParse,
    StateParsedValue,
    StylableMeta,
    StylableProcessor,
    valueMapping,
    VarSymbol,
} from '@stylable/core';
import {
    MinimalPath,
    SchemaStates,
    StateDict,
    stylableCssVar,
    StylableModuleSchema,
    StylableSymbolSchema,
    stylableVar,
} from './types';

export function extractSchema(
    css: string,
    filePath: string,
    root: string,
    path: MinimalPath,
    resolveNamespace?: (namespace: string, source: string) => string
) {
    const processor = new StylableProcessor(undefined, resolveNamespace);
    const meta = processor.process(safeParse(css, { from: filePath }));
    return generateSchema(meta, filePath, root, path);
}

export function generateSchema(
    meta: StylableMeta,
    filePath: string,
    basePath: string,
    path: MinimalPath
): StylableModuleSchema {
    const schema: StylableModuleSchema = {
        $id: `/${path.relative(basePath, filePath).replace(/\\/g, '/')}`,
        $ref: 'stylable/module',
        namespace: meta.namespace,
    };

    for (const entry of Object.keys(meta.mappedSymbols)) {
        if (!schema.properties) {
            schema.properties = {};
        }

        const symbol = meta.mappedSymbols[entry];

        if (typeof schema.properties[entry] === 'boolean') {
            continue;
        } else {
            if (symbol._kind === 'class' || symbol._kind === 'element') {
                schema.properties[entry] = {};
                const schemaEntry = schema.properties[entry] as StylableSymbolSchema;
                const { [valueMapping.states]: states, [valueMapping.extends]: extended } = symbol;

                if (symbol.alias && symbol.alias.import) {
                    addModuleDependency(schema, filePath, symbol.alias.import.from, basePath, path);

                    schemaEntry.$ref = getImportedRef(filePath, symbol.alias, basePath, path);
                } else {
                    schemaEntry.$ref = `stylable/${symbol._kind}`;
                }

                if (states) {
                    schemaEntry.states = getStatesForSymbol(states);
                }

                if (extended) {
                    schemaEntry.extends =
                        extended._kind === 'import' && extended.import
                            ? { $ref: getImportedRef(filePath, extended, basePath, path) }
                            : { $ref: extended.name };
                }

                generateCssDocs(meta, symbol, schemaEntry);
            } else if (symbol._kind === 'var') {
                schema.properties[entry] = {
                    $ref: stylableVar,
                };

                generateCssDocs(meta, symbol, schema.properties[entry] as StylableSymbolSchema);
            } else if (symbol._kind === 'cssVar') {
                schema.properties[entry] = {
                    $ref: stylableCssVar,
                };
            }
        }
    }

    return schema;
}

function generateCssDocs(
    meta: StylableMeta,
    symbol: ClassSymbol | ElementSymbol | VarSymbol,
    schemaEntry: StylableSymbolSchema
) {
    const cssDoc = getCssDocsForSymbol(meta, symbol);
    if (cssDoc) {
        if (cssDoc.description) {
            schemaEntry.description = cssDoc.description;
        }
        if (Object.keys(cssDoc.tags).length) {
            schemaEntry.docTags = cssDoc.tags;
        }
    }
}

function addModuleDependency(
    schema: StylableModuleSchema,
    filePath: string,
    importPath: string,
    basePath: string,
    path: MinimalPath
) {
    if (!schema.moduleDependencies) {
        schema.moduleDependencies = [];
    }
    const importedPath = normalizeImportPath(filePath, importPath, basePath, path);
    if (!schema.moduleDependencies.includes(importedPath)) {
        schema.moduleDependencies.push(importedPath);
    }
}

function getStatesForSymbol(states: MappedStates): StateDict {
    const res: StateDict = {};

    for (const stateName of Object.keys(states)) {
        const stateDef = states[stateName];
        if (stateDef === null) {
            // handle boolean states
            res[stateName] = { type: 'boolean' };
        } else if (typeof stateDef === 'object') {
            // handle typed states
            res[stateName] = convertMappedStateToSchema(stateDef);
        } else if (typeof stateDef === 'string') {
            // handle mapped states
            res[stateName] = { type: 'mapped' };
        }
    }

    return res;
}

function convertMappedStateToSchema(state: StateParsedValue): SchemaStates {
    const stateSchema: SchemaStates = { type: state.type };

    if (state.defaultValue) {
        stateSchema.default = state.defaultValue;
    }

    if (state.arguments.length) {
        stateSchema.enum = [];
        stateSchema.type = 'string';
        for (const arg of state.arguments) {
            if (typeof arg === 'string') {
                // enum options
                stateSchema.enum.push(arg);
            }
        }
    }

    return stateSchema;
}

function getImportedRef(
    fileName: string,
    importSymbol: ImportSymbol,
    basePath: string,
    path: MinimalPath
): string {
    const suffix = importSymbol.type === 'default' ? 'root' : `${importSymbol.name}`;
    return `${normalizeImportPath(
        fileName,
        importSymbol.import.fromRelative,
        basePath,
        path
    )}#${suffix}`;
}

function normalizeImportPath(
    fileName: string,
    importString: string,
    basePath: string,
    path: MinimalPath
): string {
    if (importString.startsWith('.')) {
        // is relative
        return (
            '/' +
            path
                .join(path.dirname(path.relative(basePath, fileName)), importString)
                .replace(/\\/g, '/')
        );
    } else if (path.isAbsolute(importString)) {
        return '/' + path.relative(basePath, importString).replace(/\\/g, '/');
    } else {
        // 3rd party
        return importString.replace(/\\/g, '/');
    }
}
