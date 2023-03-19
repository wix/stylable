import { defaultStylableMatcher } from './common';
import nodeFs from '@file-services/node';
import { stylableModuleFactory } from '@stylable/module-utils';
import { resolveNamespace } from './resolve-namespace';
import { fileURLToPath } from 'url';

const stylableToModule = stylableModuleFactory(
    {
        projectRoot: 'root',
        fileSystem: nodeFs,
        resolveNamespace,
        resolverCache: new Map(),
    },
    {
        moduleType: 'esm',
        // point to cjs - the esm runtime isn't published with mjs
        // and causes issues. currently it's problematic for direct esm
        // usage and only works for bundlers.
        runtimePath: '@stylable/runtime/dist/pure.js',
    }
);

export interface LoaderContext {
    conditions: string[];
    format?: string | null;
    importAssertions: Record<string, string>;
}

export interface LoaderResult {
    format: string;
    shortCircuit?: boolean;
    source: string | ArrayBuffer | SharedArrayBuffer | Uint8Array;
}

export async function load(
    url: string,
    context: LoaderContext,
    next: (specifier: string, context: LoaderContext) => Promise<LoaderResult>
): Promise<LoaderResult> {
    if (defaultStylableMatcher(url)) {
        const filePath = fileURLToPath(url);
        const sheetSource = nodeFs.readFileSync(filePath, { encoding: 'utf-8' });
        const moduleSource = stylableToModule(sheetSource, filePath);
        return {
            shortCircuit: true,
            format: 'module',
            source: moduleSource,
        };
    }

    // Defer to the next hook in the chain
    return next(url, context);
}
