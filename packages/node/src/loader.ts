import { defaultStylableMatcher } from './common.js';
import { nodeFs as fs } from '@file-services/node';
import { stylableModuleFactory } from '@stylable/module-utils';
import { loadStylableConfigEsm } from '@stylable/build-tools';
import { resolveNamespace } from './resolve-namespace.js';
import { fileURLToPath } from 'url';

let createModule: ReturnType<typeof stylableModuleFactory>;
async function generateJsModule(sheetSource: string, filePath: string) {
    if (!createModule) {
        createModule = await initiateModuleFactory();
    }
    return createModule(sheetSource, filePath);
}
async function initiateModuleFactory() {
    const defaultConfig = await loadStylableConfigEsm(process.cwd(), (potentialConfigModule: any) =>
        potentialConfigModule.defaultConfig?.(fs),
    );
    return stylableModuleFactory(
        {
            resolveNamespace,
            ...(defaultConfig?.config || {}),
            projectRoot: '/',
            fileSystem: fs,
        },
        {
            moduleType: 'esm',
        },
    );
}

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
    next: (specifier: string, context: LoaderContext) => Promise<LoaderResult>,
): Promise<LoaderResult> {
    if (defaultStylableMatcher(url)) {
        const filePath = fileURLToPath(url);
        const sheetSource = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const moduleSource = await generateJsModule(sheetSource, filePath);
        return {
            shortCircuit: true,
            format: 'module',
            source: moduleSource,
        };
    }

    // Defer to the next hook in the chain
    return next(url, context);
}
