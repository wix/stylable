import { Diagnostic, Diagnostics } from '@stylable/core';
import postcss, { Postcss, Root, parse, CssSyntaxError } from 'postcss';

export type CodeMod = (ast: Root, diagnostics: Diagnostics, context: { postcss: Postcss }) => void;

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

        apply(ast, diagnostics, { postcss });

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
