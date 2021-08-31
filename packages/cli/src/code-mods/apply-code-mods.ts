import { Root, parse } from 'postcss';
import { stImportToAtImport } from './st-import-to-at-import';

export type CodeMod = (ast: Root, messages: string[]) => void;

export const registeredMods: Map<string, CodeMod> = new Map([
    ['st-import-to-at-import', stImportToAtImport],
]);

export function applyCodeMods(css: string, mods: Set<{ id: string; apply: CodeMod }>) {
    const reports = new Map<string, string[]>();
    const ast = parse(css);
    for (const { id, apply } of mods) {
        const messages: string[] = [];
        apply(ast, messages);
        if (messages.length) {
            reports.set(id, messages);
        }
    }

    return {
        css: ast.toString(),
        reports,
    };
}
