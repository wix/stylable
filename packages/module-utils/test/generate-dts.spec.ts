import fs, { writeFileSync } from 'fs';
import { join } from 'path';
import { Stylable } from '@stylable/core';
import { createDTSContent } from '@stylable/module-utils';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import { expect } from 'chai';
import {
    createProgram,
    ModuleKind,
    ModuleResolutionKind,
    ScriptTarget,
    formatDiagnostics,
} from 'typescript';

describe('Generate DTS', () => {
    let tk!: DTSKit;

    beforeEach(async () => {
        tk = await new DTSKit().init();
    });

    afterEach(async () => {
        await tk.dispose();
    });

    it('Basic DTS', () => {
        tk.populate({
            'test.st.css': '.root{}',
            'test.ts': `
                import { eq } from "./test-kit";
                import { classes } from "./test.st.css";
                
                eq<"test__root">(classes.root);
            `,
        });

        expect(tk.typecheck('test.ts')).to.equal('');
    });
});

class DTSKit {
    tmp!: ITempDirectory;
    populate!: (files: Record<string, string>) => void;
    stylable!: Stylable;
    sourcePath!: (filePath: string) => string;
    write!: (internalPath: string, content: string) => void;
    genDTS!: (internalPath: string) => void;
    typecheck!: (internalPath: string) => string;
    async init() {
        const testKit: Record<string, string> = {
            'test-kit.ts': `export function eq<T>(t:T){return t}`,
        };
        const tmp = await createTempDirectory('dts-gen');
        const sourcePath = (filePath: string) => join(tmp.path, filePath);
        const populate = (files: Record<string, string>) => {
            for (const filePath in files) {
                writeFileSync(sourcePath(filePath), files[filePath]);
                if (filePath.endsWith('.st.css')) {
                    genDTS(filePath);
                }
            }
            for (const filePath in testKit) {
                writeFileSync(sourcePath(filePath), testKit[filePath]);
            }
        };
        const write = (internalPath: string, content: string) => {
            writeFileSync(sourcePath(internalPath), content);
        };
        const stylable = Stylable.create({
            projectRoot: tmp.path,
            fileSystem: fs,
            resolveNamespace(ns) {
                return ns;
            },
        });
        const genDTS = (internalPath: string) => {
            const results = stylable.transform(stylable.process(sourcePath(internalPath)));
            write(internalPath + '.d.ts', createDTSContent(results));
        };
        const typecheck = (internalPath: string) => {
            const filePath = sourcePath(internalPath);
            const program = createProgram({
                options: {
                    module: ModuleKind.ES2020,
                    moduleResolution: ModuleResolutionKind.NodeJs,
                    target: ScriptTarget.ES2020,
                    strict: true,
                    types: [],
                    lib: [],
                },
                rootNames: [filePath],
            });
            const sourceFile = program.getSourceFile(filePath);
            const diagnostics = program.getSemanticDiagnostics(sourceFile);
            const diagnosticsReport = formatDiagnostics(diagnostics, {
                getCanonicalFileName(path) {
                    return path;
                },
                getNewLine() {
                    return '\n';
                },
                getCurrentDirectory() {
                    return tmp.path;
                },
            });
            return diagnosticsReport;
        };

        this.tmp = tmp;
        this.populate = populate;
        this.stylable = stylable;
        this.sourcePath = sourcePath;
        this.write = write;
        this.genDTS = genDTS;
        this.typecheck = typecheck;
        return this;
    }
    async dispose() {
        await this.tmp.remove();
    }
}
