import { Node } from 'postcss';

export class Invalid extends Node {
    public value!: string;
    public assume: Set<string> = new Set();
    constructor(defaults?: { value: string }) {
        if (
            defaults &&
            typeof defaults.value !== 'undefined' &&
            typeof defaults.value !== 'string'
        ) {
            defaults = {
                ...defaults,
                value: String(defaults.value),
            };
        }
        super(defaults);
        this.type = 'invalid';
    }
}
