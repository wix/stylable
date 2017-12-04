import { RuntimeStylesheet } from './types';
export declare function create(root: string, namespace: string, localMapping: {
    [key: string]: string;
}, css: string | null, moduleId: string): RuntimeStylesheet;
