import { Diagnostic, Diagnostics } from '@stylable/core';
import postcss, { parse, CssSyntaxError } from 'postcss';
import type { CodeMod, ApplyCodeModsResult } from './types';

export function applyCodeMods(
    filePath: string,
    css: string,
    mods: Set<{ id: string; apply: CodeMod }>
): ApplyCodeModsResult {
    try {
        const reports = new Map<string, Diagnostic[]>();
        const ast = parse(css, { from: filePath });
        let modifications = 0;

        for (const { id, apply } of mods) {
            const diagnostics = new Diagnostics();

            const { changed } = apply({ ast, diagnostics, postcss });

            if (changed) {
                modifications++;
            }

            if (diagnostics.reports.length) {
                reports.set(id, diagnostics.reports);
            }
        }
        return {
            filePath,
            type: 'success',
            css: ast.toString(),
            reports,
            modifications,
        };
    } catch (error) {
        return {
            filePath,
            type: 'failure',
            error: normalizeError(error),
        };
    }
}

function normalizeError(error: unknown): CssSyntaxError | Error {
    return error instanceof CssSyntaxError || error instanceof Error
        ? error
        : new Error(String(error));
}
