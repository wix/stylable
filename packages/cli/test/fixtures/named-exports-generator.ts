import { Generator as Base } from '@stylable/cli';

export class Generator extends Base {
    private count = 0;
    public generateImport() {
        return {
            defaultName: 'Style' + this.count++,
            named: {
                name: '.Named' + this.count++,
            },
        };
    }
    protected generateIndexSource(indexFileTargetPath: string) {
        const source = super.generateIndexSource(indexFileTargetPath);
        return '@namespace "INDEX";\n' + source;
    }
}
