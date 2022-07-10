import { IndexGenerator, ReExports, reExportsAllSymbols } from '@stylable/cli';

export class Generator extends IndexGenerator {
    public generateReExports(filePath: string): ReExports {
        return reExportsAllSymbols(filePath, this);
    }
    protected generateIndexSource() {
        const source = super.generateIndexSource();
        return '@namespace "INDEX";\n' + source;
    }
}
