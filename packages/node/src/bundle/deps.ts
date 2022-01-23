declare module 'typescript' {
    export function normalizeSlashes(path: string): string;
}

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeSlashes } from 'typescript';
import { createResolver } from './create-resolver';
import { findImportRanges, ITextRange, parseCode } from './find-imports';

type ResolvedImport = Array<{ resolved: string | undefined } & ITextRange>;
type Modules = Record<string, ResolvedImport>;

interface WalkContext {
    entryPoints: Set<string>;
    modules: Modules;
    context: string;
    ignoreSet: Set<string>;
    readFileSync: (filePath: string) => string;
    getResolver(filePath: string): (issuer: string, request: string) => string | undefined;
    getParser(filePath: string): (content: string) => Iterable<ITextRange>;
    buildModule(filePath: string): void;
    run(): void;
}

export function run({
    context,
    ignoreList,
    entryPoints,
}: {
    context: string;
    ignoreList: string[];
    entryPoints: string[];
}) {
    const resolveRequest = createResolver(context, true);

    const walkContext: WalkContext = {
        modules: {},
        entryPoints: new Set(entryPoints.map((entry) => normalizeSlashes(resolve(entry, context)))),
        ignoreSet: new Set(ignoreList.map((entry) => normalizeSlashes(resolve(entry, context)))),
        context: normalizeSlashes(resolve(context)),
        readFileSync: (filePath: string) => readFileSync(filePath, 'utf8'),
        getResolver() {
            return resolveRequest;
        },
        getParser(filePath: string) {
            return (content: string) => findImportRanges(parseCode(filePath, content));
        },
        buildModule(filePath: string) {
            const { modules, getResolver, getParser, readFileSync } = this;
            if (!modules[filePath]) {
                const imports: ResolvedImport = (modules[filePath] = []);
                const parser = getParser(filePath);
                const resolver = getResolver(filePath);
                const content = readFileSync(filePath);
                for (const importRange of parser(content)) {
                    imports.push({
                        ...importRange,
                        resolved: resolver(filePath, importRange.text),
                    });
                }
                for (const resolvedImport of imports) {
                    if (!resolvedImport.resolved) {
                        continue;
                    }
                    this.buildModule(resolvedImport.resolved);
                }
            }
        },
        run() {
            for (const entry of this.entryPoints) {
                this.buildModule(entry);
            }
        },
    };

    return walkContext;
}
