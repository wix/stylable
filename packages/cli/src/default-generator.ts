import { Stylable } from '@stylable/core';
import { FileSystem } from '@stylable/node';
import camelcase from 'lodash.camelcase';
import upperfirst from 'lodash.upperfirst';
import { basename, join, relative } from 'path';
import { addDotSlash, createImportForComponent, ensureDirectory, tryRun } from './build-tools';

export class Generator {
    private indexFileOutput: Array<{
        from: string;
        defaultName: string;
        named: Record<string, string>;
    }> = [];
    private collisionDetector = new NameCollisionDetector<string>();
    constructor(protected stylable: Stylable, private log: (...args: string[]) => void) {}
    public generateImport(
        filePath: string
    ): { defaultName: string; named: Record<string, string> } {
        return {
            defaultName: this.filename2varname(filePath),
            named: {},
        };
    }
    public generateFileIndexEntry(filePath: string, fullOutDir: string) {
        const { defaultName, named } = this.generateImport(filePath);
        this.checkForCollisions(defaultName, named, filePath);
        this.log('[Generator Index]', `Add file: ${filePath}`);
        this.indexFileOutput.push({
            defaultName,
            named,
            from: addDotSlash(relative(fullOutDir, filePath)),
        });
    }
    public generateIndexFile(fs: FileSystem, fullOutDir: string, indexFile: string) {
        const indexFileTargetPath = join(fullOutDir, indexFile);
        const indexFileContent = this.generateIndexSource(indexFileTargetPath);
        ensureDirectory(fullOutDir, fs);
        tryRun(
            () => fs.writeFileSync(indexFileTargetPath, '\n' + indexFileContent + '\n'),
            'Write Index File Error'
        );
        this.log('[Generator Index]', 'creating index file: ' + indexFileTargetPath);
    }
    public filename2varname(filePath: string) {
        const varname = basename(basename(filePath, '.css'), '.st') // remove prefixes and .st.css ext
            .replace(/^\d+/, ''); // remove leading numbers
        return upperfirst(camelcase(varname));
    }

    protected generateIndexSource(_indexFileTargetPath: string) {
        return this.indexFileOutput
            .map((_) => createImportForComponent(_.from, _.defaultName, _.named))
            .join('\n');
    }

    private checkForCollisions(
        defaultName: string,
        named: Record<string, string>,
        filePath: string
    ) {
        this.collisionDetector.detect(defaultName, filePath);
        for (const asName of Object.values(named)) {
            this.collisionDetector.detect(asName, filePath);
        }
        if (this.collisionDetector.collisions.size) {
            let errorMessage = 'Name Collision Error:';
            for (const [name, origin] of this.collisionDetector.collisions) {
                errorMessage += `\nexport symbol ${name} from ${filePath} is already used by ${origin}`;
            }
            throw new Error(errorMessage);
        }
    }
}

class NameCollisionDetector<Origin> {
    nameMapping = new Map<string, Origin>();
    collisions = new Map<string, Origin>();
    detect(name: string, origin: Origin) {
        if (this.nameMapping.has(name)) {
            this.collisions.set(name, this.nameMapping.get(name)!);
        } else {
            this.nameMapping.set(name, origin);
        }
    }
}
