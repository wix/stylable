import { processFactory } from './jest';

export const process = processFactory(
    {},
    {
        runtimePath: require.resolve('@stylable/runtime/cjs/index-legacy')
    }
);
