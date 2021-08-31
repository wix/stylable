import { Diagnostic, Diagnostics } from '@stylable/core';
import { Root, parse } from 'postcss';
import { stImportToAtImport } from './st-import-to-at-import';

export type CodeMod = (ast: Root, diagnostics: Diagnostics) => void;

export const registeredMods: Map<string, CodeMod> = new Map([
    ['st-import-to-at-import', stImportToAtImport],
]);

export function applyCodeMods(css: string, mods: Set<{ id: string; apply: CodeMod }>) {
    const reports = new Map<string, Diagnostic[]>();
    const ast = parse(css);
    for (const { id, apply } of mods) {
        const diagnostics = new Diagnostics();

        apply(ast, diagnostics);

        if (diagnostics.reports.length) {
            reports.set(id, diagnostics.reports);
        }
    }

    return {
        css: ast.toString(),
        reports,
    };
}
