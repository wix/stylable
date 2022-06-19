import type { IFileSystem } from '@file-services/types';

export type FileSystem = any;

export function findFiles(
    fs: Pick<IFileSystem, 'readdirSync' | 'statSync'>,
    join: IFileSystem['join'],
    relative: IFileSystem['relative'],
    rootDirectory: string,
    ext: string,
    blacklist: Set<string>,
    useRelative = false
) {
    const errors: Error[] = [];
    const result = new Set<string>();
    const folders = [rootDirectory];
    while (folders.length) {
        const current = folders.pop()!;
        try {
            fs.readdirSync(current, { withFileTypes: true }).forEach((item) => {
                if (blacklist.has(item.name)) {
                    return;
                }
                const itemFullPath = join(current, item.name);
                try {
                    if (item.isDirectory()) {
                        folders.push(itemFullPath);
                    } else if (item.isFile() && itemFullPath.endsWith(ext)) {
                        result.add(
                            useRelative ? relative(rootDirectory, itemFullPath) : itemFullPath
                        );
                    }
                } catch (e) {
                    errors.push(e as Error);
                }
            });
        } catch (e) {
            errors.push(e as Error);
        }
    }
    return { result, errors };
}
