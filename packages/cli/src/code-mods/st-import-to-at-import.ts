import { parsePseudoImport, Imported } from '@stylable/core';
import type { Postcss, AtRule } from 'postcss';
import type { CodeMod } from './types';

export const stImportToAtImport: CodeMod = ({ ast, diagnostics, postcss, modifications }) => {
    ast.walkRules((rule) => {
        if (rule.selector === ':import') {
            const importObj = parsePseudoImport(rule, '*', diagnostics);

            if (!diagnostics.reports.length) {
                if (ast.last === rule) {
                    ast.raws.semicolon = true;
                }
                rule.replaceWith(createAtImport(importObj, postcss));
                modifications.count++;
            }
        }
    });
};

function createAtImport(importObj: Imported, postcss: Postcss): AtRule {
    const named = Object.entries(importObj.named);
    const keyframes = Object.entries(importObj.keyframes);
    let params = '';
    if (importObj.defaultExport) {
        params += importObj.defaultExport;
    }
    if (importObj.defaultExport && (named.length || keyframes.length)) {
        params += ', ';
    }
    if (named.length || keyframes.length) {
        params += '[';

        const namedParts = getNamedImportParts(named);
        const keyFramesParts = getNamedImportParts(keyframes);

        params += namedParts.join(', ');

        if (keyFramesParts.length) {
            if (namedParts.length) {
                params += ', ';
            }
            params += `keyframes(${keyFramesParts.join(', ')})`;
        }
        params += ']';
    }

    params += ` from ${JSON.stringify(importObj.request)}`;

    return postcss.atRule({ name: 'st-import', params });
}

function getNamedImportParts(named: [string, string][]) {
    const parts: string[] = [];
    for (const [as, name] of named) {
        if (as === name) {
            parts.push(name);
        } else {
            parts.push(`${name} as ${as}`);
        }
    }

    return parts;
}
