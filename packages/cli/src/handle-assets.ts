import type { IFileSystem } from '@file-services/types';
import { ensureDirectory } from './build-tools';

export function handleAssets(
    assets: Set<string>,
    rootDir: string,
    srcDir: string,
    outDir: string,
    fs: IFileSystem
) {
    const generatedAssets = new Set<string>();

    const { dirname, join } = fs;
    for (const originalPath of assets) {
        if (fs.existsSync(originalPath)) {
            const content = fs.readFileSync(originalPath);
            const targetPath = originalPath.replace(join(rootDir, srcDir), join(rootDir, outDir));
            const targetDir = dirname(targetPath);
            ensureDirectory(targetDir, fs);
            fs.writeFileSync(targetPath, content);
            generatedAssets.add(targetPath);
        }
    }

    return generatedAssets;
}
