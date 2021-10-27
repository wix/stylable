import { parsePseudoImport } from '@stylable/core';
import { createAtImportProps } from './stylable-imports-tools';
import type { CodeMod } from './types';

export const stImportToAtImport: CodeMod = ({ ast, diagnostics, postcss }) => {
    let changed = false;
    ast.walkRules((rule) => {
        if (rule.selector === ':import') {
            const importObj = parsePseudoImport(rule, '*', diagnostics);

            if (!diagnostics.reports.length) {
                if (ast.last === rule) {
                    ast.raws.semicolon = true;
                }
                rule.replaceWith(postcss.atRule(createAtImportProps(importObj)));
                changed = true;
            }
        }
    });

    return {
        changed,
    };
};
