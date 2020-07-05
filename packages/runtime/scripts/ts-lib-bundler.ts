import fs from 'fs';
import { basename } from 'path';
import ts from 'typescript';

interface Options {
    name: string;
    entry: string;
    includeEntry?: boolean;
    header?: string;
    allowOverride?: string[];
}

export function bundle({ name, entry, includeEntry, header }: Options) {
    const files = getBundleFilesFromEntry(entry, includeEntry);
    console.log('bundling files\n', files);
    const res = bundleFiles(name, files);
    console.log('done bundling.');
    return header ? `${header}\n${res}` : res;
}

export function useModule(outModule: string, libExports: string[], allowOverride: string[] = []) {
    let exportErrors: Array<string | number | symbol> = [];
    const _exports = new Proxy({} as Record<keyof any, unknown>, {
        set(t, k, v, r) {
            return t[k as string] !== undefined
                ? (exportErrors.push(k), true)
                : Reflect.set(t, k, v, r);
        },
    });
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('$', `(${outModule})($)`)(_exports);
    const missing = libExports.filter((exportSymbol) => !_exports[exportSymbol]);
    if (missing.length) {
        throw new Error(`missing lib exports ["${missing.join('", "')}"]`);
    }

    exportErrors = exportErrors.filter((k) => !allowOverride.some((o) => o === k));

    if (exportErrors.length) {
        throw new Error(`duplicate export ["${exportErrors.join('", "')}"]`);
    }
}

export function ensureWrite(filePath: string, source: string) {
    fs.writeFileSync(filePath, source, 'utf8');
    if (fs.readFileSync(filePath, 'utf8') !== source) {
        throw new Error(`file ${filePath} is not written to disk correctly`);
    }
}

function getBundleFilesFromEntry(entry: string, includeEntry = true) {
    const program = ts.createProgram({ rootNames: [entry], options: {} });

    const entryFile = includeEntry ? undefined : program.getSourceFile(entry);
    const names = program
        .getSourceFiles()
        .filter((s) => s !== entryFile)
        .map((s) => s.fileName)
        .filter((f) => !f.endsWith('.d.ts'));
    return names;
}

function bundleFiles(name: string, files: string[]) {
    const libCode = files
        .map((filePath) => {
            const source = fs.readFileSync(filePath, 'utf8');
            const res = ts.transpileModule(source, {
                fileName: filePath,
                transformers: { after: [cleanup()] },
            });

            return res.outputText
                ? `(function(){/* source: ${basename(filePath)} */\n${res.outputText}}());`
                : '';
        })
        .join('\n');

    return `function ${name}(exports){\nexports = exports || {};\nfunction require(){return exports;};\n${libCode};\nreturn exports;\n}`;
}

/* Transformers */
function cleanup() {
    return () => {
        return (sf: ts.SourceFile) => ts.updateSourceFileNode(sf, sf.statements.slice(2));
    };
}
