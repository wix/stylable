import { Generator as Base, ReExports } from '@stylable/cli';

export class Generator extends Base {
    public generateReExports(filePath: string): ReExports {
        const meta = this.stylable.process(filePath);
        const rootExport = this.filename2varname(filePath);
        const parts = Object.keys(meta.classes)
            .filter((name) => name !== meta.root)
            .reduce<Record<string, string>>((acc, className) => {
                acc[className] = `${rootExport}__${className}`;
                return acc;
            }, {});
        const stVars = meta.vars.reduce<Record<string, string>>((acc, { name }) => {
            acc[name] = `var_${rootExport}__${name}`;
            return acc;
        }, {});
        const vars = Object.keys(meta.cssVars).reduce<Record<string, string>>((acc, varName) => {
            acc[varName] = `--${rootExport}__${varName.slice(2)}`;
            return acc;
        }, {});
        const keyframes = Object.keys(meta.mappedKeyframes).reduce<Record<string, string>>(
            (acc, keyframe) => {
                acc[keyframe] = `${rootExport}__${keyframe}`;
                return acc;
            },
            {}
        );
        return {
            root: rootExport,
            parts,
            keyframes,
            stVars,
            vars,
        };
    }
    protected generateIndexSource(indexFileTargetPath: string) {
        const source = super.generateIndexSource(indexFileTargetPath);
        return '@namespace "INDEX";\n' + source;
    }
}
