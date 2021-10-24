import type { Diagnostic, Diagnostics } from '@stylable/core';
import type { Postcss, Root, CssSyntaxError } from 'postcss';

export interface CodeModContext {
    ast: Root;
    diagnostics: Diagnostics;
    postcss: Postcss;
}

export interface CodeModResponse {
    changed: boolean;
}

export type CodeMod = (context: CodeModContext) => CodeModResponse;

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
    modifications: number;
}

export type ApplyCodeModsResult = ApplyCodeModsSuccess | ApplyCodeModsFailure;
