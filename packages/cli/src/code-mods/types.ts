import type { Diagnostic, Diagnostics } from '@stylable/core';
import type { Postcss, Root, CssSyntaxError } from 'postcss';

export interface CodeModContext {
    ast: Root;
    diagnostics: Diagnostics;
    modifications: Modifications;
    postcss: Postcss;
}

export type CodeMod = (context: CodeModContext) => void;

export interface Modifications {
    count: number;
}

export interface ApplyCodeModsFailure {
    type: 'failure';
    filePath: string;
    error: CssSyntaxError | Error;
}

export interface ApplyCodeModsSuccess {
    type: 'success';
    filePath: string;
    css: string;
    reports: Map<string, Diagnostic[]>;
    modifications: { count: number };
}

export type ApplyCodeModsResult = ApplyCodeModsSuccess | ApplyCodeModsFailure;
