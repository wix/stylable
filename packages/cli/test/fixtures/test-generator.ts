import { Generator as Base, ReExports } from '@stylable/cli';

export class Generator extends Base {
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
