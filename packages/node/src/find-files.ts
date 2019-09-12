import { join, relative } from 'path';

export type FileSystem = any;

export function findFiles(fs: FileSystem, rootDirectory: string, ext: string, blacklist: Set<string>, useRelative = false) {
    const errors: Error[] = [];
    const result: string[] = [];
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
                        result.push(useRelative ? relative(rootDirectory, itemFullPath) : itemFullPath);
                    }
                } catch (e) {
                    errors.push(e);
                }
            });
        } catch (e) {
            errors.push(e);
        }
    }
    return { result, errors };
}
