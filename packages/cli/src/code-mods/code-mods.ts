import { FileSystem, findFiles } from '@stylable/node';
import { applyCodeMods, CodeMod } from './apply-code-mods';
import { relative, join } from 'path';
import type { Log } from '../logger';

export interface BuildOptions {
    fs: FileSystem;
    rootDir: string;
    extension: string;
    mods: Set<{ id: string; apply: CodeMod }>;
    log: Log;
}

export function codeMods({ fs, rootDir, extension, mods, log }: BuildOptions) {
    if (mods.size === 0) {
        return log('No codemods to apply provided. Bail execution.');
    }

    const { result: files } = findFiles(
        fs,
        join,
        relative,
        rootDir,
        extension,
        new Set<string>(['node_modules', '.git'])
    );

    if (files.size === 0) {
        return log('No stylable files found.');
    }

    log(`Transforming ${files.size} stylable files.`);

    const skipped = [];
    const finished = [];
    for (const filePath of files) {
        const result = applyCodeMods(fs.readFileSync(filePath).toString(), mods);

        if (result.type === 'failure') {
            log(`${filePath}: failed to parse\n${result.error.toString()}`);
            skipped.push(filePath);
        } else {
            const { css, reports } = result;

            if (reports.size) {
                for (const [modName, diagnosticsReports] of reports) {
                    for (const report of diagnosticsReports) {
                        const error = report.node.error(report.message, report.options);

                        log(
                            `[${modName}]`,
                            `${filePath}: ${report.message}\n${error.showSourceCode()}`
                        );
                    }
                }
                skipped.push(filePath);
            } else {
                fs.writeFileSync(filePath, css);
                finished.push(filePath);
            }
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
