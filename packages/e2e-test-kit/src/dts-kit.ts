import fs, { readFileSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Stylable } from '@stylable/core';
import { generateDTSContent } from '@stylable/module-utils';
import { createTempDirectorySync, ITempDirectorySync } from './file-system-helpers';
import {
    createProgram,
    ModuleKind,
    ModuleResolutionKind,
    ScriptTarget,
    formatDiagnostics,
} from 'typescript';

export class DTSKit {
    tmp: ITempDirectorySync;
    testKit: Record<string, string>;
    stylable: Stylable;
    constructor() {
        this.testKit = {
            'test-kit.ts': `export function eq<T>(t:T){return t}`,
        };
        this.tmp = createTempDirectorySync('dts-gen');

        this.stylable = Stylable.create({
            projectRoot: this.tmp.path,
            fileSystem: fs,
            resolveNamespace(ns) {
                return ns;
            },
        });
    }

    public populate(files: Record<string, string>, generateDts = true) {
        for (const filePath in files) {
            writeFileSync(this.sourcePath(filePath), files[filePath]);
            if (generateDts && filePath.endsWith('.st.css')) {
                this.genDTS(filePath);
            }
        }
        for (const filePath in this.testKit) {
            writeFileSync(this.sourcePath(filePath), this.testKit[filePath]);
        }
    }

    public typecheck(internalPath: string, lib: string[] = []) {
        const filePath = this.sourcePath(internalPath);
        const program = createProgram({
            options: {
                module: ModuleKind.ES2020,
                moduleResolution: ModuleResolutionKind.NodeJs,
                target: ScriptTarget.ES2020,
                strict: true,
                types: [],
                skipDefaultLibCheck: true,
                lib: lib.length ? lib : ['lib.es2020.d.ts'],
            },
            rootNames: [filePath],
        });
        const syntacticDiagnostics = program.getSyntacticDiagnostics();

        if (syntacticDiagnostics.length) {
            throw new Error(
                `Syntax error found: ${syntacticDiagnostics.map((e) => e.messageText).join(' ')}`
            );
        }

        const semanticDiagnostics = program.getSemanticDiagnostics();
        const tmpPath = this.tmp.path;
        const diagnosticsReport = formatDiagnostics(semanticDiagnostics, {
            getCanonicalFileName(path) {
                return path;
            },
            getNewLine() {
                return '\n';
            },
            getCurrentDirectory() {
                return tmpPath;
            },
        });
        return diagnosticsReport;
    }

    public write(internalPath: string, content: string) {
        writeFileSync(this.sourcePath(internalPath), content);
    }

    public read(internalPath: string) {
        return readFileSync(this.sourcePath(internalPath), { encoding: 'utf8' });
    }

    public dispose() {
        this.tmp.remove();
    }

    public linkNodeModules() {
        symlinkSync(
            join(__dirname, '../../../node_modules'),
            join(this.tmp.path, 'node_modules'),
            'junction'
        );
    }

    private genDTS(internalPath: string) {
        const results = this.stylable.transform(
            this.stylable.process(this.sourcePath(internalPath))
        );
        this.write(internalPath + '.d.ts', generateDTSContent(results));
    }

    private sourcePath(filePath: string) {
        return join(this.tmp.path, filePath);
    }
}
