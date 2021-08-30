import { FileSystem, findFiles } from '@stylable/node';
import { applyCodeMods, CodeMod, registeredMods } from './apply-code-mods';
import { relative, join } from 'path';

export interface BuildOptions {
    fs: FileSystem;
    rootDir: string;
    extension: string;
    mods: string[];
    log: (...args: string[]) => void;
}

export function codeMods({ fs, rootDir, extension, mods, log }: BuildOptions) {
    const { result: files } = findFiles(
        fs,
        join,
        relative,
        rootDir,
        extension,
        new Set<string>(['node_modules', '.git'])
    );

    if (mods.length === 0) {
        return log('No mods provided.');
    }

    if (files.size === 0) {
        return log('No stylable files found.');
    }

    log(`Transforming ${files.size} stylable files.`);

    const loadedMods = new Set<{ id: string; apply: CodeMod }>();
    for (const id of mods) {
        const apply = registeredMods.get(id);
        if (!apply) {
            log(`Unknown mod ${id}`);
        } else {
            loadedMods.add({ id, apply });
        }
    }

    if (loadedMods.size !== mods.length) {
        return;
    }

    const skipped = [];
    const finished = [];
    for (const filePath of files) {
        const { css, reports } = applyCodeMods(fs.readFileSync(filePath).toString(), loadedMods);
        if (reports.size) {
            for (const [modName, messages] of reports) {
                for (const message of messages) {
                    log(`[${modName}]`, `${filePath}: ${message}`);
                }
            }
            skipped.push(filePath);
        } else {
            fs.writeFileSync(filePath, css);
            finished.push(filePath);
        }
    }

    log('Summery:');

    for (const filePath of finished) {
        log(`√ ${filePath}`);
    }

    for (const filePath of skipped) {
        log(`✗ ${filePath}`);
    }
}
