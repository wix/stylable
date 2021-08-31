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
            fs.readdirSync(current).forEach((item: string) => {
                if (blacklist.has(item)) {
                    return;
                }
                const itemFullPath = join(current, item);
                try {
                    const status = fs.statSync(itemFullPath);
                    if (status.isDirectory()) {
                        folders.push(itemFullPath);
                    } else if (status.isFile() && itemFullPath.endsWith(ext)) {
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
