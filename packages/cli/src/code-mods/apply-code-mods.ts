import { Diagnostic, Diagnostics } from '@stylable/core';
import { Root, parse, CssSyntaxError } from 'postcss';
import { stImportToAtImport } from './st-import-to-at-import';

export type CodeMod = (ast: Root, diagnostics: Diagnostics) => void;

export const registeredMods: Map<string, CodeMod> = new Map([
    ['st-import-to-at-import', stImportToAtImport],
]);

interface ApplyCodeModsFailure {
    type: 'failure';
    error: CssSyntaxError | Error;
}

interface ApplyCodeModsSuccess {
    type: 'success';
    css: string;
    reports: Map<string, Diagnostic[]>;
}

type ApplyCodeModsResult = ApplyCodeModsSuccess | ApplyCodeModsFailure;

export function applyCodeMods(
    css: string,
    mods: Set<{ id: string; apply: CodeMod }>
): ApplyCodeModsResult {
    const reports = new Map<string, Diagnostic[]>();
    let ast: Root;

    try {
        ast = parse(css);
    } catch (error) {
        if (error instanceof CssSyntaxError || error instanceof Error) {
            return {
                type: 'failure',
                error,
            };
        } else {
            return {
                type: 'failure',
                error: new Error(String(error)),
            };
        }
    }

    for (const { id, apply } of mods) {
        const diagnostics = new Diagnostics();

        apply(ast, diagnostics);

        if (diagnostics.reports.length) {
            reports.set(id, diagnostics.reports);
        }
    }
    return {
        type: 'success',
        css: ast.toString(),
        reports,
    };
}
