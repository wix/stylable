import type { IFileSystem } from '@file-services/types';
import type { Stylable } from '@stylable/core';
import { STSymbol } from '@stylable/core/dist/features';
import camelcase from 'lodash.camelcase';
import upperfirst from 'lodash.upperfirst';
import { basename, relative } from 'path';
import { normalizeRelative, ensureDirectory, tryRun } from './build-tools';
import type { Log } from './logger';

export interface ReExports {
    root: string;
    classes: Record<string, string>;
    keyframes: Record<string, string>;
    vars: Record<string, string>;
    stVars: Record<string, string>;
}

export class IndexGenerator {
    private indexFileOutput = new Map<string, ReExports>();
    private collisionDetector = new NameCollisionDetector<string>();

    constructor(public stylable: Stylable, private log: Log) {}

    public generateReExports(filePath: string): ReExports | undefined {
        return {
            root: this.filename2varname(filePath),
            classes: {},
            keyframes: {},
            stVars: {},
            vars: {},
        };
    }

    public generateFileIndexEntry(filePath: string, fullOutDir: string) {
        const reExports = this.generateReExports(filePath);
        if (reExports) {
            this.checkForCollisions(reExports, filePath);
            this.log('[Generator Index]', `Add file: ${filePath}`);
            this.indexFileOutput.set(normalizeRelative(relative(fullOutDir, filePath)), reExports);
        }
    }

    public removeEntryFromIndex(filePath: string, fullOutDir: string) {
        this.indexFileOutput.delete(normalizeRelative(relative(fullOutDir, filePath)));
    }

    public generateIndexFile(fs: IFileSystem, indexFileTargetPath: string) {
        const indexFileContent = this.generateIndexSource(indexFileTargetPath);
        ensureDirectory(fs.dirname(indexFileTargetPath), fs);
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
        return [...this.indexFileOutput.entries()]
            .map(([from, reExports]) => createImportForComponent(from, reExports))
            .join('\n');
    }

    private checkForCollisions(reExports: ReExports, filePath: string) {
        this.collisionDetector.detect(reExports.root, filePath);

        for (const asName of Object.values(reExports.classes)) {
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

export function reExportsAllSymbols(filePath: string, generator: IndexGenerator): ReExports {
    const meta = generator.stylable.process(filePath);
    const rootExport = generator.filename2varname(filePath);
    const classes = Object.keys(meta.getAllClasses())
        .filter((name) => name !== meta.root)
        .reduce<Record<string, string>>((acc, className) => {
            acc[className] = `${rootExport}__${className}`;
            return acc;
        }, {});
    const stVars = meta.vars.reduce<Record<string, string>>((acc, { name }) => {
        acc[name] = `${rootExport}__${name}`;
        return acc;
    }, {});
    const vars = Object.keys(STSymbol.getAllByType(meta, `cssVar`)).reduce<Record<string, string>>(
        (acc, varName) => {
            acc[varName] = `--${rootExport}__${varName.slice(2)}`;
            return acc;
        },
        {}
    );
    const keyframes = Object.keys(STSymbol.getAllByType(meta, `keyframes`)).reduce<
        Record<string, string>
    >((acc, keyframe) => {
        acc[keyframe] = `${rootExport}__${keyframe}`;
        return acc;
    }, {});
    return {
        root: rootExport,
        classes,
        keyframes,
        stVars,
        vars,
    };
}

class NameCollisionDetector<Origin> {
    nameMapping = new Map<string, Origin>();
    collisions = new Map<string, Origin>();
    detect(name: string, origin: Origin) {
        if (this.nameMapping.has(name) && origin !== this.nameMapping.get(name)) {
            this.collisions.set(name, this.nameMapping.get(name)!);
        } else {
            this.nameMapping.set(name, origin);
        }
    }
}

function createImportForComponent(from: string, reExports: ReExports) {
    const namedPart = [
        ...Object.entries(reExports.classes).map(symbolMapper),
        ...Object.entries(reExports.stVars).map(symbolMapper),
        ...Object.entries(reExports.vars).map(symbolMapper),
        ...Object.entries(reExports.keyframes).map(keyframesSymbolMapper),
    ].join(', ');

    const usagePart = Object.values(reExports.classes)
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
