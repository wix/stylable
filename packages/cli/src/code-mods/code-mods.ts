import { FileSystem, findFiles } from '@stylable/node';
import { applyCodeMods } from './apply-code-mods';
import { relative, join } from 'path';
import type { ApplyCodeModsResult, ApplyCodeModsSuccess, CodeMod } from './types';
import type { Log } from '../logger';
import type { Diagnostic } from '@stylable/core';

export interface CodeModsOptions {
    fs: FileSystem;
    rootDir: string;
    extension: string;
    mods: Set<{ id: string; apply: CodeMod }>;
    log: Log;
}

export function codeMods({ fs, rootDir, extension, mods, log }: CodeModsOptions) {
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

    const failed: ApplyCodeModsResult[] = [];
    const skipped: ApplyCodeModsSuccess[] = [];
    const finished: ApplyCodeModsSuccess[] = [];

    for (const filePath of files) {
        const source = fs.readFileSync(filePath).toString();
        const result = applyCodeMods(filePath, source, mods);

        if (result.type === 'failure') {
            log(`${filePath}: failed to parse\n${result.error.toString()}`);
            failed.push(result);
        } else {
            const { css, reports, modifications } = result;

            if (reports.size) {
                logReports(reports, filePath, log);
                failed.push(result);
            } else {
                if (modifications > 0) {
                    fs.writeFileSync(filePath, css);
                    finished.push(result);
                } else {
                    skipped.push(result);
                }
            }
        }
    }

    log('Summery:');

    for (const { filePath } of skipped) {
        log(`− ${filePath}`);
    }

    for (const { filePath, modifications } of finished) {
        log(`√ ${filePath} (${modifications} applied codemods)`);
    }

    for (const { filePath } of failed) {
        log(`✗ ${filePath}`);
    }
}

function logReports(reports: Map<string, Diagnostic[]>, filePath: string, log: Log) {
    for (const [name, diagnosticsReports] of reports) {
        for (const report of diagnosticsReports) {
            const error = report.node.error(report.message, { word: report.word });
            log(`[${name}]`, `${filePath}: ${report.message}\n${error.showSourceCode()}`);
        }
    }
}
