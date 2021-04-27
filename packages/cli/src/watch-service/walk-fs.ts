import type { IFileSystem } from '@file-services/types';

export interface DirectoryItem {
    type: 'file' | 'directory';
    path: string;
    name: string;
    relativePath: string;
}
/**
 * Deeply iterate into a directory's child directories/files.
 * Provides `DirectoryItem` instances for each item, giving parents before leafs.
 *
 * @param directoryPath directory to iterate into.
 * @param basePath base directory to compute relative paths from. defaults to `directoryPath`.
 */
export async function* directoryDeepChildren(
    fs: IFileSystem,
    directoryPath: string,
    filterItem: (item: DirectoryItem) => boolean = returnsTrue,
    basePath = directoryPath
): AsyncGenerator<DirectoryItem, void, unknown> {
    for (const item of await fs.promises.readdir(directoryPath, {
        withFileTypes: true,
    })) {
        const itemName = item.name;
        const itemPath = fs.join(directoryPath, itemName);
        const relativePath = fs.relative(basePath, itemPath);
        if (item.isFile()) {
            const fileItem: DirectoryItem = {
                type: 'file',
                path: itemPath,
                name: itemName,
                relativePath,
            };
            if (filterItem(fileItem)) {
                yield fileItem;
            }
        } else if (item.isDirectory()) {
            const directoryItem: DirectoryItem = {
                type: 'directory',
                path: itemPath,
                name: itemName,
                relativePath,
            };
            if (filterItem(directoryItem)) {
                yield directoryItem;
                yield* directoryDeepChildren(fs, itemPath, filterItem, basePath);
            }
        }
    }
}
function returnsTrue() {
    return true;
}
