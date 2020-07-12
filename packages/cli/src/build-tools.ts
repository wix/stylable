import type { StylableResults } from '@stylable/core';
import type { FileSystem } from '@stylable/node';
import { dirname } from 'path';

export function handleDiagnostics(
    diagnostics: ((...args: string[]) => void) | undefined,
    res: StylableResults,
    diagnosticsMsg: string[],
    filePath: string
) {
    const reports = res.meta.transformDiagnostics
        ? res.meta.diagnostics.reports.concat(res.meta.transformDiagnostics.reports)
        : res.meta.diagnostics.reports;
    if (diagnostics && reports.length) {
        diagnosticsMsg.push(`Errors in file: ${filePath}`);
        reports.forEach((report) => {
            const err = report.node.error(report.message, report.options);
            diagnosticsMsg.push([report.message, err.showSourceCode()].join('\n'));
        });
    }
}

export function tryRun<T>(fn: () => T, errorMessage: string): T {
    try {
        return fn();
    } catch (e) {
        throw new Error(errorMessage + ': \n' + e.stack);
    }
}

export function createImportForComponent(from: string, defaultName: string) {
    return [
        `:import {-st-from: ${JSON.stringify(from)};-st-default:${defaultName};}`,
        `.root ${defaultName}{}`,
    ].join('\n');
}

export function addDotSlash(p: string) {
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

export function ensureAssets(
    projectAssetsMap: {
        [key: string]: string;
    },
    fs: FileSystem
) {
    Object.keys(projectAssetsMap).map((assetOriginalPath) => {
        if (fs.existsSync(assetOriginalPath)) {
            const content = fs.readFileSync(assetOriginalPath);
            const targetPath = projectAssetsMap[assetOriginalPath];
            const targetDir = dirname(targetPath);
            ensureDirectory(targetDir, fs);
            fs.writeFileSync(targetPath, content);
        }
    });
}
