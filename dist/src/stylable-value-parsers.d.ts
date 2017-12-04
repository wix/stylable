import * as postcss from 'postcss';
import { Diagnostics } from './diagnostics';
export interface MappedStates {
    [s: string]: string | null;
}
export interface TypedClass {
    '-st-root'?: boolean;
    '-st-states'?: string[] | MappedStates;
    '-st-extends'?: string;
    '-st-variant'?: boolean;
}
export interface MixinValue {
    type: string;
    options: Array<{
        value: string;
    }>;
}
export declare const valueMapping: {
    from: "-st-from";
    named: "-st-named";
    default: "-st-default";
    root: "-st-root";
    states: "-st-states";
    extends: "-st-extends";
    mixin: "-st-mixin";
    variant: "-st-variant";
    compose: "-st-compose";
    theme: "-st-theme";
    global: "-st-global";
};
export declare type stKeys = keyof typeof valueMapping;
export declare const stValues: string[];
export declare const STYLABLE_VALUE_MATCHER: RegExp;
export declare const STYLABLE_NAMED_MATCHER: RegExp;
export declare const SBTypesParsers: {
    '-st-root'(value: string): boolean;
    '-st-variant'(value: string): boolean;
    '-st-theme'(value: string): boolean;
    '-st-global'(decl: postcss.Declaration, _diagnostics: Diagnostics): any;
    '-st-states'(value: string, _diagnostics: Diagnostics): MappedStates;
    '-st-extends'(value: string): string;
    '-st-named'(value: string): {
        [key: string]: string;
    };
    '-st-mixin'(mixinNode: postcss.Declaration, diagnostics: Diagnostics): {
        type: string;
        options: {
            value: string;
        }[];
    }[];
    '-st-compose'(composeNode: postcss.Declaration, diagnostics: Diagnostics): string[];
};
