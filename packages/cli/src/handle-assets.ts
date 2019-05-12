import { join } from 'path';
import { ensureAssets } from './build-tools';

export function handleAssets(
    assets: string[],
    rootDir: string,
    srcDir: string,
    outDir: string,
    fs: any
) {
    const projectAssetMapping: {
        [key: string]: string;
    } = {};
    assets.forEach((originalPath: string) => {
        projectAssetMapping[originalPath] = originalPath.replace(
            join(rootDir, srcDir),
            join(rootDir, outDir)
        );
    });
    ensureAssets(projectAssetMapping, fs);
}
