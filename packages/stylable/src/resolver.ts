
import { Pojo } from './types';

export interface Module {
    default: any;
    [key: string]: any;
}

export class Resolver {
    //TODO: replace any with Module
    private zMap: Pojo<any> = {};
    constructor(initialMap: Pojo<any>) {
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
