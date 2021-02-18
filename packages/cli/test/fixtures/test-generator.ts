import { Generator as Base, ReExports } from '@stylable/cli';

export class Generator extends Base {
    private count = 0;
    public generateReExports(): ReExports {
        return {
            root: 'Style' + this.count++,
            classes: {},
            keyframes: {},
            stVars: {},
            vars: {},
        };
    }
}
