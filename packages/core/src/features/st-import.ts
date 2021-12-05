import { createFeature, FeatureContext } from './feature';
import { generalDiagnostics } from './diagnostics';
import type { Imported } from './types';
import * as STSymbol from './st-symbol';
import { plugableRecord } from '../helpers/plugable-record';
import { parseStImport, parsePseudoImport } from '../stylable-imports-tools';
import { isCSSVarProp } from '../stylable-utils';
import { rootValueMapping } from '../stylable-value-parsers';
import path from 'path';
import type { ImmutablePseudoClass, PseudoClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

const dataKey = plugableRecord.key<Record<string, any>>('import');

export const diagnostics = {
    NO_ST_IMPORT_IN_NESTED_SCOPE() {
        return `cannot use "@st-import" inside of nested scope`;
    },
    NO_PSEUDO_IMPORT_IN_NESTED_SCOPE() {
        return `cannot use ":import" inside of nested scope`;
    },
    INVALID_CUSTOM_PROPERTY_AS_VALUE(name: string, as: string) {
        return `invalid alias for custom property "${name}" as "${as}"; custom properties must be prefixed with "--" (double-dash)`;
    },
    FORBIDDEN_DEF_IN_COMPLEX_SELECTOR: generalDiagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR,
};

// HOOKS

export const hooks = createFeature<{
    SELECTOR: PseudoClass;
    IMMUTABLE_SELECTOR: ImmutablePseudoClass;
}>({
    analyzeInit(context) {
        plugableRecord.set(context.meta.data, dataKey, {});
        // analyze imports first
        const remove: Array<postcss.Rule | postcss.AtRule> = [];
        const dirContext = path.dirname(context.meta.source);
        context.meta.ast.walk((node) => {
            const isImportDef =
                (node.type === `atrule` && node.name === `st-import`) ||
                (node.type === `rule` && node.selector === `:import`);
            if (!isImportDef) {
                return;
            }
            const isStImport = node.type === `atrule`;
            if (node.parent?.type !== `root`) {
                context.diagnostics.warn(
                    node,
                    isStImport
                        ? diagnostics.NO_ST_IMPORT_IN_NESTED_SCOPE()
                        : diagnostics.NO_PSEUDO_IMPORT_IN_NESTED_SCOPE()
                );
            } else {
                const stImport = isStImport
                    ? parseStImport(node, dirContext, context.diagnostics)
                    : parsePseudoImport(node, dirContext, context.diagnostics);
                context.meta.imports.push(stImport);
                addImportSymbols(stImport, context, dirContext);
            }
            remove.push(node);
        });
        // remove imports - ToDo: move to transform phase
        for (const node of remove) {
            node.remove();
        }
    },
    analyzeSelectorNode({ context, rule, node }) {
        // forbid `:import` pseudo-class as part of multiple selectors
        if (rule.selector !== `:import` && node.value === `import`) {
            context.diagnostics.warn(
                rule,
                diagnostics.FORBIDDEN_DEF_IN_COMPLEX_SELECTOR(rootValueMapping.import)
            );
        }
    },
});

// API

function addImportSymbols(importDef: Imported, context: FeatureContext, dirContext: string) {
    checkForInvalidAsUsage(importDef, context);
    if (importDef.defaultExport) {
        STSymbol.addSymbol({
            context,
            localName: importDef.defaultExport,
            symbol: {
                _kind: 'import',
                type: 'default',
                name: 'default',
                import: importDef,
                context: dirContext,
            },
            node: importDef.rule,
        });
    }
    Object.keys(importDef.named).forEach((name) => {
        STSymbol.addSymbol({
            context,
            localName: name,
            symbol: {
                _kind: 'import',
                type: 'named',
                name: importDef.named[name],
                import: importDef,
                context: dirContext,
            },
            node: importDef.rule,
        });
    });
    Object.keys(importDef.keyframes).forEach((name) => {
        if (!checkRedeclareKeyframes(context, name, importDef.rule)) {
            // ToDo: move to STSymbol.addSymbol({namespace: `keyframes`})
            context.meta.mappedKeyframes[name] = {
                _kind: 'keyframes',
                alias: name,
                name: importDef.keyframes[name],
                import: importDef,
            };
        }
    });
}

function checkForInvalidAsUsage(importDef: Imported, context: FeatureContext) {
    for (const [local, imported] of Object.entries(importDef.named)) {
        if (isCSSVarProp(imported) && !isCSSVarProp(local)) {
            context.diagnostics.warn(
                importDef.rule,
                diagnostics.INVALID_CUSTOM_PROPERTY_AS_VALUE(imported, local)
            );
        }
    }
}

// ToDo: move to st-symbol once symbol namespace is implemented
function REDECLARE_SYMBOL_KEYFRAMES(name: string) {
    return `redeclare keyframes symbol "${name}"`;
}
function checkRedeclareKeyframes(context: FeatureContext, symbolName: string, node: postcss.Node) {
    const symbol = context.meta.mappedKeyframes[symbolName];
    if (symbol) {
        context.diagnostics.warn(node, REDECLARE_SYMBOL_KEYFRAMES(symbolName), {
            word: symbolName,
        });
    }
    return symbol;
}
