import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    symlinkSync,
    writeFileSync,
} from 'fs';
import { join, relative } from 'path';

export interface Files {
    [filepath: string]: string;
}

export const symlinkSymbol = Symbol('symlink');

export interface LinkedDirectory {
    type: typeof symlinkSymbol;
    path: string;
}
export interface FilesStructure {
    [filepath: string]: string | FilesStructure | LinkedDirectory;
}

export function populateDirectorySync(
    rootDir: string,
    files: FilesStructure,
    context: { symlinks: Map<string, Set<string>> } = { symlinks: new Map() }
) {
    for (const [filePath, content] of Object.entries(files)) {
        const path = join(rootDir, filePath);

        if (typeof content === 'object') {
            if (content.type === symlinkSymbol) {
                const existingPath = join(path, content.path as string);
                try {
                    symlinkSync(existingPath, path, 'junction');
                } catch {
                    // The existing path does not exist yet so we save it in the context to create it later.

                    if (!context.symlinks.has(existingPath)) {
                        context.symlinks.set(existingPath, new Set());
                    }

                    context.symlinks.get(existingPath)!.add(path);
                }
            } else {
                mkdirSync(path);

                if (context.symlinks.has(path)) {
                    for (const linkedPath of context.symlinks.get(path)!) {
                        symlinkSync(path, linkedPath, 'junction');
                    }

                    context.symlinks.delete(path);
                }

                populateDirectorySync(path, content as FilesStructure, context);
            }
        } else {
            writeFileSync(path, content);

            if (context.symlinks.has(path)) {
                for (const linkedPath of context.symlinks.get(path)!) {
                    symlinkSync(path, linkedPath, 'junction');
                }

                context.symlinks.delete(path);
            }
        }
    }
}

export function loadDirSync(rootPath: string, dirPath: string = rootPath): Files {
    return readdirSync(dirPath).reduce<Files>((acc, entry) => {
        const fullPath = join(dirPath, entry);
        const key = relative(rootPath, fullPath).replace(/\\/g, '/');
        const stat = statSync(fullPath);
        if (stat.isFile()) {
            acc[key] = readFileSync(fullPath, 'utf8');
        } else if (stat.isDirectory()) {
            return {
                ...acc,
                ...loadDirSync(rootPath, fullPath),
            };
        } else {
            throw new Error('Not Implemented');
        }
        return acc;
    }, {});
}

export function writeToExistingFile(filePath: string, content: string) {
    if (existsSync(filePath)) {
        writeFileSync(filePath, content);
    } else {
        throw new Error(`file ${filePath} does not exist`);
    }
}
