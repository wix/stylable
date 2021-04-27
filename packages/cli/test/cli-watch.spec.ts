import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { spawn } from 'child_process';
import { expect } from 'chai';
import { on } from 'events';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

function runCli(cliArgs: string[] = [], cwd: string) {
    const cliPath = require.resolve('@stylable/cli/bin/stc.js');
    return spawn('node', [cliPath, ...cliArgs], { cwd });
}

interface Files {
    [filepath: string]: string;
}

function loadDirSync(rootPath: string, dirPath: string = rootPath): Files {
    return readdirSync(dirPath).reduce<Files>((acc, entry) => {
        const fullPath = join(dirPath, entry);
        const key = relative(rootPath, fullPath);
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

function populateDirectorySync(rootDir: string, files: Files) {
    for (const filePath in files) {
        writeFileSync(join(rootDir, filePath), files[filePath]);
    }
}

describe.skip('Stylable Cli', () => {
    let tempDir: ITempDirectory;
    let child: ChildProcessWithoutNullStreams;
    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
        if (child) {
            child.kill();
        }
    });

    it('simple watch mode', async () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `
                @st-import X from "./depend.st.css";
                .root{color:red}
            `,
            'depend.st.css': `
                .root{color:green}
            `,
        });

        child = runCli(['--rootDir', tempDir.path, '--outDir', './dist', '-w'], tempDir.path);

        for await (const e of on(child.stdout, 'data')) {
            const msg = e.toString();
            if (msg.includes('watch started')) {
                writeToExistingFile(join(tempDir.path, 'depend.st.css'), '.root{color:yellow}');
            }
        }
        function a() {
            const dirContent = loadDirSync(tempDir.path);
            expect(dirContent).eql({});
        }
        console.log(a);
    });
});

function writeToExistingFile(filePath: string, content: string) {
    if (existsSync(filePath)) {
        writeFileSync(filePath, content);
    } else {
        throw new Error('file dose not exist');
    }
}
