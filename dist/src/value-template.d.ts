import { Pojo } from './types';
export declare const matchValue: RegExp;
export declare function valueReplacer(value: string, data: Pojo, onMatch: (value: string, name: string, match: string) => any, debug?: boolean): string;
