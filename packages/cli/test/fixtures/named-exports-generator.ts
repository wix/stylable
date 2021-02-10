import { Generator as Base } from '@stylable/cli';

export class Generator extends Base {
    public generateImport(filePath: string) {
        const meta = this.stylable.process(filePath);
        const rootExport = this.filename2varname(filePath);
        const named = Object.keys(meta.classes)
            .filter((name) => name !== meta.root)
            .reduce<Record<string, string>>((acc, className) => {
                acc[className] = `.${rootExport}__${className}`;
                return acc;
            }, {});
        return {
            defaultName: rootExport,
            named: named,
        };
    }
    protected generateIndexSource(indexFileTargetPath: string) {
        const source = super.generateIndexSource(indexFileTargetPath);
        return '@namespace "INDEX";\n' + source;
    }
}
