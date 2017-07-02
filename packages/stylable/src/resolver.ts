import { Pojo } from './types';
import { Stylesheet } from './stylesheet';


export class Resolver {
    private zMap: Pojo<Stylesheet> = {};
    constructor(initialMap: Pojo<Stylesheet>) {
        this.zMap = { ...initialMap };
    }
    resolveModule(path: string) {
        const value = this.zMap[path];
        if (!value) {
            throw new Error("can't resolve " + path);
        }
        return value;
    }
}
