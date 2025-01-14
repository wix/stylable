import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { nodeFs as fs } from '@file-services/node';
import type { IDirectoryContents, IFileSystem } from '@file-services/types';

export function createTempDirectorySync(prefix = 'temp-') {
    const path = fs.realpathSync.native(mkdtempSync(fs.join(tmpdir(), prefix)));
    const remove = () => fs.rmSync(path, { recursive: true, force: true });

    return { path, remove, setContent: copyDirectory.bind(null, fs, path) };
}
export function copyDirectory(fs: IFileSystem, targetPath: string, content: IDirectoryContents) {
    fs.ensureDirectorySync(targetPath);
    for (const [name, value] of Object.entries(content)) {
        const itemPath = fs.join(targetPath, name);
        if (typeof value === 'string') {
            fs.writeFileSync(itemPath, value, { encoding: 'utf-8' });
        } else {
            copyDirectory(fs, itemPath, value);
        }
    }
}
