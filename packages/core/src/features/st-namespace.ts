import path from 'path';
import { createFeature, FeatureContext } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import { filename2varname } from '../helpers/string';
import { stripQuotation } from '../helpers/string';
import valueParser from 'postcss-value-parser';
import { murmurhash3_32_gc } from '../murmurhash';
import type { Diagnostics } from '../diagnostics';
import type { AtRule } from 'postcss';

export const diagnostics = {
    INVALID_NAMESPACE_DEF: () => 'invalid @st-namespace',
    EMPTY_NAMESPACE_DEF: () => '@st-namespace must contain at least one character or digit',
    INVALID_NAMESPACE_REFERENCE: () => 'st-namespace-reference dose not have any value',
    EXTRA_DEFINITION: () => '@st-namespace must contain a single string definition',
    INVALID_NAMESPACE_VALUE: () => '@st-namespace must contain only letters, numbers or dashes',
};

const dataKey = plugableRecord.key<string[]>('namespace');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, []);
    },
    analyzeAtRule({ context, atRule }) {
        const isSTNamespace = atRule.name === 'st-namespace';
        const isNamespace = atRule.name === 'namespace';
        if (!isSTNamespace && !isNamespace) {
            return;
        }
        const diag = isSTNamespace ? context.diagnostics : undefined;
        const match = parseNamespace(atRule, diag);
        if (match) {
            const collected = plugableRecord.getUnsafe(context.meta.data, dataKey);
            collected.push(match);
        }
    },
    prepareAST({ node, toRemove }) {
        if (node.type === 'atrule' && (node.name === `st-namespace` || node.name === `namespace`)) {
            toRemove.push(node);
        }
    },
});

// API

function parseNamespace(node: AtRule, diag?: Diagnostics): string | undefined {
    const { nodes } = valueParser(node.params);
    if (!nodes.length) {
        // empty params (not even empty quotes)
        diag?.error(node, diagnostics.EMPTY_NAMESPACE_DEF());
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
                    diag?.error(node, diagnostics.EXTRA_DEFINITION(), {
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
                diag?.error(node, diagnostics.EXTRA_DEFINITION(), {
                    word: valueParser.stringify(valueNode),
                });
                isInvalid = true;
                namespace = undefined;
            }
        }
    }
    if (namespace === undefined) {
        // no namespace found
        diag?.error(node, diagnostics.INVALID_NAMESPACE_DEF());
        return;
    }
    if (namespace !== undefined && namespace.trim() === '') {
        // empty namespace found
        diag?.error(node, diagnostics.EMPTY_NAMESPACE_DEF());
        return;
    }
    // ident like - without escapes
    // eslint-disable-next-line no-control-regex
    if (!namespace.match(/^([a-zA-Z-_]|[^\x00-\x7F]+)([a-zA-Z-_0-9]|[^\x00-\x7F])*$/)) {
        // empty namespace found
        diag?.error(node, diagnostics.INVALID_NAMESPACE_VALUE(), {
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
    const collected = plugableRecord.getUnsafe(meta.data, dataKey);
    const namespace =
        collected[collected.length - 1] || filename2varname(path.basename(meta.source)) || 's';
    // resolve path origin
    let pathToSource: string | undefined;
    let length = meta.ast.nodes.length;
    while (length--) {
        const node = meta.ast.nodes[length];
        if (node.type === 'comment' && node.text.includes('st-namespace-reference')) {
            const i = node.text.indexOf('=');
            if (i === -1) {
                context.diagnostics.error(node, diagnostics.INVALID_NAMESPACE_REFERENCE());
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
