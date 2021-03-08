import { Root, parse } from 'postcss';
import { stImportToAtImport } from './st-import-to-at-import';

export const registeredMods: Record<
    string,
    (ast: Root, messages: string[]) => void
> = Object.assign(Object.create(null), {
    'st-import-to-at-import': stImportToAtImport,
});

export function applyCodeMods(
    css: string,
    filePath: string,
    mods: Array<(ast: Root, messages: string[]) => void>
) {
    const ast = parse(css);
    const messages: string[] = [];
    for (const mod of mods) {
        mod(ast, messages);
    }

    return {
        css: ast.toString(),
        filePath,
        messages,
    };
}
