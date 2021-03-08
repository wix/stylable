import { parsePseudoImport, Diagnostics, Imported } from '@stylable/core';
import postcss, { Root, AtRule } from 'postcss';

export function stImportToAtImport(ast: Root, messages: string[]) {
    ast.walkRules((rule) => {
        if (rule.selector === ':import') {
            const diagnostics = new Diagnostics();
            const importObj = parsePseudoImport(rule, '*', diagnostics);
            if (diagnostics.reports.length) {
                messages.push(`failed to parse/replace :import`);
            } else {
                rule.replaceWith(createAtImport(importObj));
            }
        }
    });
}

function createAtImport(importObj: Imported): AtRule {
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
        const namedParts: string[] = [];
        for (const [as, name] of named) {
            if (as === name) {
                namedParts.push(name);
            } else {
                namedParts.push(`${name} as ${as}`);
            }
        }
        const keyFramesParts: string[] = [];
        for (const [as, name] of keyframes) {
            if (as === name) {
                keyFramesParts.push(name);
            } else {
                keyFramesParts.push(`${name} as ${as}`);
            }
        }
        params += namedParts.join(', ');

        if (keyFramesParts.length) {
            if (namedParts.length) {
                params += ', ';
            }
            params += `keyframes(${keyFramesParts.join(', ')})`;
        }
        params += ']';
    }

    params += ` from ${JSON.stringify(importObj.request)};`;

    return postcss.atRule({ name: 'st-import', params });
}
