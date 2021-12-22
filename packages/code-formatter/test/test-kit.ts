import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface FilesStructure {
    [filepath: string]: string | FilesStructure;
}
export function loadDirStructureSync(dirPath: string): FilesStructure {
    const output: FilesStructure = {};
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        const name = entry.name;
        if (entry.isFile()) {
            output[name] = readFileSync(join(dirPath, name), 'utf8');
        } else if (entry.isDirectory()) {
            output[name] = loadDirStructureSync(join(dirPath, name));
        } else {
            throw new Error(`unexpected file type: ${name}`);
        }
    }
    return output;
}
export function forEachTestCase(struct: FilesStructure, cb: any, parent = '') {
    const handled = new Set();
    for (const [name, value] of Object.entries(struct)) {
        if (typeof value === 'string') {
            if (handled.has(name)) {
                continue;
            }
            if (name.includes('.in.')) {
                const pair = name.replace('.in.', '.out.');
                handled.add(name);
                handled.add(pair);
                cb({
                    parent,
                    input: {
                        name,
                        value,
                    },
                    out: {
                        name: pair,
                        value: struct[pair],
                    },
                });
            } else if (name.includes('.out.')) {
                const pair = name.replace('.out.', '.in.');
                handled.add(name);
                handled.add(pair);
                cb({
                    parent,
                    input: {
                        name: pair,
                        value: struct[pair],
                    },
                    out: {
                        name,
                        value,
                    },
                });
            }
        } else {
            forEachTestCase(value, cb, join(parent, name));
        }
    }
}
