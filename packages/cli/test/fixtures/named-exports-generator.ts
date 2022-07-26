import { Generator as Base, ReExports, reExportsAllSymbols } from '@stylable/cli';

export class Generator extends Base {
    public generateReExports(filePath: string): ReExports {
        return reExportsAllSymbols(filePath, this);
    }

    protected generateIndexSource(indexFileTargetPath: string) {
        const source = super.generateIndexSource(indexFileTargetPath);
        return '@st-namespace "INDEX";\n' + source;
    }
}
