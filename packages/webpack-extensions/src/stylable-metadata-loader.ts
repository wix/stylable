import {
    Stylable,
    StylableMeta,
    Imported,
    CSSResolve,
    JSResolve,
    valueMapping,
    processNamespace,
} from '@stylable/core';
import { loader as webpackLoader } from 'webpack';
import { hashContent } from './hash-content-util';
import { Rule, ChildNode } from 'postcss';
import findConfig from 'find-config';
import { getOptions } from 'loader-utils';

let stylable: Stylable;
const getLocalConfig = loadLocalConfigLoader();

export interface LoaderOptions {
    exposeNamespaceMapping: boolean;
    resolveNamespace(namespace: string, filePath: string): string;
}

export interface Metadata {
    entry: string;
    stylesheetMapping: Record<string, string>;
    namespaceMapping?: Record<string, string>;
}

const defaultOptions: LoaderOptions = {
    resolveNamespace: processNamespace,
    exposeNamespaceMapping: false,
};

export const metadataLoaderLocation = __filename;

export default function metadataLoader(this: webpackLoader.LoaderContext, content: string) {
    const { resolveNamespace, exposeNamespaceMapping }: LoaderOptions = {
        ...defaultOptions,
        ...getOptions(this),
        ...getLocalConfig(this.rootContext),
    };

    stylable =
        stylable ||
        Stylable.create({
            projectRoot: this.rootContext,
            fileSystem: this.fs,
            mode: this._compiler.options.mode === 'development' ? 'development' : 'production',
            resolveOptions: this._compiler.options.resolve as any /* make stylable types better */,
            timedCacheOptions: { useTimer: true, timeout: 1000 },
            resolveNamespace,
        });

    const meta = stylable.fileProcessor.processContent(content, this.resourcePath);

    const usedMeta = collectDependenciesDeep(meta);

    addWebpackWatchDependencies(this, usedMeta);

    const hashes = createContentHashPerMeta(usedMeta.keys());
    ``;
    const stylesheetMapping = rewriteImports(usedMeta, hashes);

    //`:import {-st-from: ${JSON.stringify(stylesheetMapping)}; -st-default: ${CompName};} ${CompName}{}`
    const namespaceMapping = exposeNamespaceMapping
        ? createNamespaceMapping(usedMeta, hashes)
        : undefined;

    return (
        'export default ' +
        JSON.stringify({
            stylesheetMapping,
            namespaceMapping,
            entry: `/${ensureHash(meta, hashes)}.st.css`,
        })
    );
}

function loadLocalConfigLoader() {
    const localConfig = new Map<string, Partial<LoaderOptions>>();
    return (cwd: string): Partial<LoaderOptions> => {
        if (localConfig.has(cwd)) {
            return localConfig.get(cwd)!;
        }
        let config: Partial<LoaderOptions>;
        try {
            config = findConfig.require('stylable.config', { cwd }).metadataLoader;
        } catch (e) {
            config = {};
        }
        localConfig.set(cwd, config);
        return config;
    };
}

function createNamespaceMapping(
    usedMeta: Map<StylableMeta, ResolvedImport[]>,
    hashes: Map<StylableMeta, string>
) {
    const namespaceMapping: Record<string, string> = {};
    for (const [meta] of usedMeta) {
        namespaceMapping[`/${ensureHash(meta, hashes)}.st.css`] = meta.namespace;
    }
    return namespaceMapping;
}

function addWebpackWatchDependencies(
    ctx: webpackLoader.LoaderContext,
    usedMeta: Map<StylableMeta, ResolvedImport[]>
) {
    for (const [meta] of usedMeta) {
        ctx.addDependency(meta.source);
    }
}

function rewriteImports(
    usedMeta: Map<StylableMeta, ResolvedImport[]>,
    hashes: Map<StylableMeta, string>
) {
    const sourcesByHash: Record<string, string> = {};
    for (const [meta, resolvedImports] of usedMeta.entries()) {
        const hash = ensureHash(meta, hashes);
        const rawAst = meta.rawAst.clone();
        for (const { resolved, stImport } of resolvedImports) {
            if (resolved && resolved._kind === 'css') {
                const rawRule = rawAst.nodes?.find(nodeByLocation(stImport.rule));
                if (!rawRule) {
                    throw new Error(
                        'Could not find source node for ' +
                            stImport.rule.toString() +
                            ' at ' +
                            meta.source
                    );
                }
                if (rawRule.type === 'rule') {
                    rawRule.walkDecls((decl) => {
                        if (decl.prop === valueMapping.from) {
                            decl.value = JSON.stringify(
                                `/${ensureHash(resolved.meta, hashes)}.st.css`
                            );
                        }
                    });
                } else {
                    throw new Error('Unknown import rule ' + rawRule.toString());
                }
            } else if (resolved && resolved._kind === 'js') {
                throw new Error('js import are not supported yet!');
            }
        }
        sourcesByHash[`/${hash}.st.css`] = rawAst.toString();
    }
    return sourcesByHash;
}

function nodeByLocation(ruleA: Rule) {
    return (ruleB: ChildNode) => {
        return (
            ruleB.source?.start?.column === ruleA.source?.start?.column &&
            ruleB.source?.start?.line === ruleA.source?.start?.line &&
            ruleB.source?.end?.column === ruleA.source?.end?.column &&
            ruleB.source?.end?.line === ruleA.source?.end?.line
        );
    };
}

function ensureHash(meta: StylableMeta, hashes: Map<StylableMeta, string>) {
    const hash = hashes.get(meta);
    if (!hash) {
        throw new Error('Missing meta hash for:' + meta.source);
    }
    return hash;
}

function createContentHashPerMeta(usedMeta: Iterable<StylableMeta>) {
    const hashes = new Map<StylableMeta, string>();
    for (const meta of usedMeta) {
        hashes.set(meta, hashContent(meta.rawAst.toString()));
    }
    return hashes;
}

type ResolvedImport = {
    stImport: Imported;
    resolved: CSSResolve | JSResolve | null;
};

function collectDependenciesDeep(
    meta: StylableMeta,
    out = new Map<StylableMeta, ResolvedImport[]>()
) {
    if (out.has(meta)) {
        return out;
    }
    const imports: ResolvedImport[] = [];
    out.set(meta, imports);

    for (const stImport of meta.imports) {
        const resolved = stylable.resolver.resolveImported(stImport, '');
        imports.push({ stImport, resolved });
        if (resolved && resolved._kind === 'css') {
            collectDependenciesDeep(resolved.meta, out);
        }
    }
    return out;
}
