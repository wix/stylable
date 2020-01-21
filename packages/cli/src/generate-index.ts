import { relative } from 'path';
import { join } from 'path';
import { addDotSlash, createImportForComponent, ensureDirectory, tryRun } from './build-tools';
import { Generator } from './default-generator';

export function generateFileIndexEntry(
    filePath: string,
    nameMapping: {
        [key: string]: string;
    },
    log: (...args: string[]) => void,
    indexFileOutput: Array<{
        from: string;
        name: string;
    }>,
    fullOutDir: string,
    generator: Generator
) {
    const name = generator.generateImport(filePath).default;
    if (nameMapping[name]) {
        throw new Error(
            `Name Collision Error: ${nameMapping[name]} and ${filePath} has the same filename`
        );
    }
    log('[Build Index]', `Add file: ${filePath}`);
    nameMapping[name] = filePath;
    indexFileOutput.push({
        name,
        from: addDotSlash(relative(fullOutDir, filePath))
    });
}

export function generateIndexFile(
    indexFileOutput: Array<{
        from: string;
        name: string;
    }>,
    fullOutDir: string,
    indexFile: string,
    log: (...args: string[]) => void,
    fs: any
) {
    const indexFileContent = indexFileOutput
        .map(_ => createImportForComponent(_.from, _.name))
        .join('\n');
    const indexFileTargetPath = join(fullOutDir, indexFile);
    log('[Build]', 'creating index file: ' + indexFileTargetPath);
    ensureDirectory(fullOutDir, fs);
    tryRun(
        () => fs.writeFileSync(indexFileTargetPath, '\n' + indexFileContent + '\n'),
        'Write Index File Error'
    );
}
