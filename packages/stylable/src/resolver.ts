import { Pojo } from './';
import { Stylesheet } from './stylesheet';


export class InMemoryResolver {
    private zMap: Pojo<Stylesheet> = {};
    constructor(initialMap: Pojo<Stylesheet>) {
        this.zMap = { ...initialMap };
    }
    resolve(path: string) {
        const value = this.zMap[path];
        if (!value) {
            throw new Error("can't resolve " + path);
        }
        return value;
    }
}
