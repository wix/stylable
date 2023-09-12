import path from 'path';
import { createFeature, FeatureContext } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import { filename2varname } from '../helpers/string';
import { stripQuotation } from '../helpers/string';
import valueParser from 'postcss-value-parser';
import { murmurhash3_32_gc } from '../murmurhash';
import { createDiagnosticReporter, Diagnostics } from '../diagnostics';
import type { AtRule } from 'postcss';

export const diagnostics = {
    INVALID_NAMESPACE_DEF: createDiagnosticReporter(
        '11007',
        'error',
        () => 'invalid @st-namespace'
    ),
    EMPTY_NAMESPACE_DEF: createDiagnosticReporter(
        '11008',
        'error',
        () => '@st-namespace must contain at least one character or digit'
    ),
    EXTRA_DEFINITION: createDiagnosticReporter(
        '11012',
        'error',
        () => '@st-namespace must contain a single string definition'
    ),
    INVALID_NAMESPACE_VALUE: createDiagnosticReporter(
        '11013',
        'error',
        () => '@st-namespace must contain only letters, numbers or dashes'
    ),
    INVALID_NAMESPACE_REFERENCE: createDiagnosticReporter(
        '11010',
        'error',
        () => 'st-namespace-reference dose not have any value'
    ),
    NATIVE_OVERRIDE_DEPRECATION: createDiagnosticReporter(
        '11014',
        'info',
        () => '@namespace will stop working in version 6, use @st-namespace instead'
    ),
};

const dataKey = plugableRecord.key<{
    namespaces: string[];
    usedNativeNamespace: string[];
    usedNativeNamespaceNodes: AtRule[];
    foundStNamespace: boolean;
}>('namespace');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {
            namespaces: [],
            usedNativeNamespace: [],
            usedNativeNamespaceNodes: [],
            foundStNamespace: false,
        });
    },
    analyzeAtRule({ context, atRule }) {
        const isSTNamespace = atRule.name === 'st-namespace';
        const isNamespace = atRule.name === 'namespace';
        if (!isSTNamespace && !isNamespace) {
            return;
        }
        const data = plugableRecord.getUnsafe(context.meta.data, dataKey);
        if (data.foundStNamespace && isNamespace) {
            // ignore @namespace once @st-namespace was found
            return;
        }
        const diag = isSTNamespace ? context.diagnostics : undefined;
        const match = parseNamespace(atRule, diag);
        if (match) {
            data.namespaces.push(match);
            if (isNamespace) {
                data.usedNativeNamespace.push(atRule.params);
                data.usedNativeNamespaceNodes.push(atRule);
            } else {
                // clear @namespace matches once @st-namespace if found
                data.usedNativeNamespace.length = 0;
                data.usedNativeNamespaceNodes.length = 0;
                // mark to prevent any further @namespace collection
                data.foundStNamespace = true;
            }
        }
    },
    analyzeDone(context) {
        const { usedNativeNamespaceNodes } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        for (const node of usedNativeNamespaceNodes) {
            context.diagnostics.report(diagnostics.NATIVE_OVERRIDE_DEPRECATION(), {
                node,
            });
        }
    },
    prepareAST({ context, node, toRemove }) {
        // remove @st-namespace or @namespace that was used as @st-namespace
        const { usedNativeNamespace } = plugableRecord.getUnsafe(context.meta.data, dataKey);
        if (
            node.type === 'atrule' &&
            (node.name === 'st-namespace' ||
                (node.name === 'namespace' && usedNativeNamespace.includes(node.params)))
        ) {
            toRemove.push(node);
        }
    },
});

// API

export function parseNamespace(node: AtRule, diag?: Diagnostics): string | undefined {
    const { nodes } = valueParser(node.params);
    if (!nodes.length) {
        // empty params (not even empty quotes)
        diag?.report(diagnostics.EMPTY_NAMESPACE_DEF(), { node });
        return;
    }
    let isInvalid = false;
    let namespace: string | undefined = undefined;
    for (const valueNode of nodes) {
        switch (valueNode.type) {
            case 'string': {
                if (namespace === undefined) {
                    // first namespace
                    if (!isInvalid) {
                        namespace = stripQuotation(valueNode.value);
                    }
                } else {
                    // extra definition - mark as invalid and clear namespace
                    diag?.report(diagnostics.EXTRA_DEFINITION(), {
                        node,
                        word: valueParser.stringify(valueNode),
                    });
                    isInvalid = true;
                    namespace = undefined;
                }
                break;
            }
            case 'comment':
            case 'space':
                // do nothing
                break;
            default: {
                // invalid definition - mark as invalid and clear namespace
                diag?.report(diagnostics.EXTRA_DEFINITION(), {
                    node,
                    word: valueParser.stringify(valueNode),
                });
                isInvalid = true;
                namespace = undefined;
            }
        }
    }
    if (namespace === undefined) {
        // no namespace found
        diag?.report(diagnostics.INVALID_NAMESPACE_DEF(), {
            node,
        });
        return;
    }
    if (namespace !== undefined && namespace.trim() === '') {
        // empty namespace found
        diag?.report(diagnostics.EMPTY_NAMESPACE_DEF(), {
            node,
        });
        return;
    }
    // ident like - without escapes
    // eslint-disable-next-line no-control-regex
    if (!namespace.match(/^([a-zA-Z-_]|[^\x00-\x7F]+)([a-zA-Z-_0-9]|[^\x00-\x7F])*$/)) {
        // empty namespace found
        diag?.report(diagnostics.INVALID_NAMESPACE_VALUE(), {
            node,
            word: namespace,
        });
        return;
    }
    return namespace;
}

export function defaultProcessNamespace(namespace: string, origin: string, _source?: string) {
    return namespace + murmurhash3_32_gc(origin); // .toString(36);
}

export function setMetaNamespace(
    context: FeatureContext,
    resolveNamespace: typeof defaultProcessNamespace
): void {
    const meta = context.meta;
    // resolve namespace
    const { namespaces } = plugableRecord.getUnsafe(meta.data, dataKey);
    const namespace =
        namespaces[namespaces.length - 1] || filename2varname(path.basename(meta.source)) || 's';
    // resolve path origin
    let pathToSource: string | undefined;
    let length = meta.sourceAst.nodes.length;
    while (length--) {
        const node = meta.sourceAst.nodes[length];
        if (node.type === 'comment' && node.text.includes('st-namespace-reference')) {
            const i = node.text.indexOf('=');
            if (i === -1) {
                context.diagnostics.report(diagnostics.INVALID_NAMESPACE_REFERENCE(), {
                    node,
                });
            } else {
                pathToSource = stripQuotation(node.text.slice(i + 1));
            }
            break;
        }
    }
    // generate final namespace
    meta.namespace = resolveNamespace(
        namespace,
        pathToSource ? path.resolve(path.dirname(meta.source), pathToSource) : meta.source,
        meta.source
    );
}
