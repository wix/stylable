import type { StylableExports } from '@stylable/core/dist/index-internal';
import { generateStylableJSModuleSource } from '@stylable/core';

export function createRuntimeTargetCode(namespace: string, jsExports: StylableExports) {
    const code = generateStylableJSModuleSource({
        jsExports,
        moduleType: 'cjs',
        namespace,
        varType: 'var',
    });
    return code;
}
