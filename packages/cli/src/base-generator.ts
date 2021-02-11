import { Stylable } from '@stylable/core';
import { FileSystem } from '@stylable/node';
import camelcase from 'lodash.camelcase';
import upperfirst from 'lodash.upperfirst';
import { basename, join, relative } from 'path';
import { addDotSlash, ensureDirectory, tryRun } from './build-tools';

export interface ReExports {
    root: string;
    parts: Record<string, string>;
    keyframes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, string>;
}

export class Generator {
    private indexFileOutput: Array<{
        from: string;
        reExports: ReExports;
    }> = [];
    private collisionDetector = new NameCollisionDetector<string>();

    constructor(protected stylable: Stylable, private log: (...args: string[]) => void) {}

    public generateReExports(filePath: string): ReExports {
        return {
            root: this.filename2varname(filePath),
            parts: {},
            keyframes: {},
            stVars: {},
            vars: {},
        };
    }

    public generateFileIndexEntry(filePath: string, fullOutDir: string) {
        const reExports = this.generateReExports(filePath);
        this.checkForCollisions(reExports, filePath);
        this.log('[Generator Index]', `Add file: ${filePath}`);
        this.indexFileOutput.push({
            reExports,
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
            .map((_) => createImportForComponent(_.from, _.reExports))
            .join('\n');
    }

    private checkForCollisions(reExports: ReExports, filePath: string) {
        this.collisionDetector.detect(reExports.root, filePath);

        for (const asName of Object.values(reExports.parts)) {
            this.collisionDetector.detect(asName, filePath);
        }

        for (const asName of Object.values(reExports.vars)) {
            this.collisionDetector.detect(asName, filePath);
        }

        for (const asName of Object.values(reExports.stVars)) {
            this.collisionDetector.detect(asName, filePath);
        }

        for (const asName of Object.values(reExports.keyframes)) {
            this.collisionDetector.detect(`keyframes(${asName})`, filePath);
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

function createImportForComponent(from: string, reExports: ReExports) {
    const namedPart = [
        ...Object.entries(reExports.parts).map(symbolMapper),
        ...Object.entries(reExports.stVars).map(symbolMapper),
        ...Object.entries(reExports.vars).map(symbolMapper),
        ...Object.entries(reExports.keyframes).map(keyframesSymbolMapper),
    ].join(', ');

    const usagePart = Object.values(reExports.parts)
        .map((exportName) => `.root .${exportName}{}`)
        .join(' ');

    return `:import {-st-from: ${JSON.stringify(from)};-st-default:${reExports.root};${
        namedPart ? `-st-named: ${namedPart};` : ''
    }}\n.root ${reExports.root}{}${usagePart ? `\n${usagePart}` : ''}`;
}

function symbolMapper([name, as]: [string, string]) {
    return name === as ? as : `${name} as ${as}`;
}

function keyframesSymbolMapper([name, as]: [string, string]) {
    return name === as ? `keyframes(${as})` : `keyframes(${name} as ${as})`;
}
