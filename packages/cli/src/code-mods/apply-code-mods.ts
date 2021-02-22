import { Root, parse } from 'postcss';

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
