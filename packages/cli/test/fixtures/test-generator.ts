import { IndexGenerator, ReExports } from '@stylable/cli';

export class Generator extends IndexGenerator {
    private count = 0;
    public generateReExports(filePath: string): ReExports | undefined {
        if (filePath.includes('FILTER-ME')) {
            return undefined;
        }
        return {
            root: 'Style' + this.count++,
            classes: {},
            keyframes: {},
            stVars: {},
            vars: {},
        };
    }
}
