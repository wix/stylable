import { Generator as Base } from '@stylable/cli';

export class Generator extends Base {
    private count = 0;
    public generateImport() {
        return {
            defaultName: 'Style' + this.count++,
            named: {},
        };
    }
}
