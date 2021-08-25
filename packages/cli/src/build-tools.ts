import type { StylableResults } from '@stylable/core';
import type { FileSystem } from '@stylable/node';
import type { DiagnosticMessages } from './report-diagnostics';
import { dirname } from 'path';

export function handleDiagnostics(
    res: StylableResults,
    diagnosticsMessages: DiagnosticMessages,
    filePath: string
) {
    const reports = res.meta.transformDiagnostics
        ? res.meta.diagnostics.reports.concat(res.meta.transformDiagnostics.reports)
        : res.meta.diagnostics.reports;
    if (reports.length) {
        diagnosticsMessages.set(
            filePath,
            reports.map((report) => {
                const err = report.node.error(report.message, report.options);
                return {
                    type: report.type,
                    message: `${report.message}\n${err.showSourceCode()}`,
                };
            })
        );
    }
}

export function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack);
    }
}

export function normalizeRelative(p: string) {
    p = p.replace(/\\/g, '/');
    return p.startsWith('.') ? p : './' + p;
}

export function ensureDirectory(dir: string, fs: FileSystem) {
    if (dir === '.' || fs.existsSync(dir)) {
        return;
    }
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        const parentDir = dirname(dir);
        if (parentDir !== dir) {
            ensureDirectory(parentDir, fs);
            fs.mkdirSync(dir);
        }
    }
}
