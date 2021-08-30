import { parsePseudoImport, Diagnostics, Imported } from '@stylable/core';
import postcss, { Root, AtRule } from 'postcss';

export function stImportToAtImport(ast: Root, messages: string[]) {
    ast.walkRules((rule) => {
        if (rule.selector === ':import') {
            const diagnostics = new Diagnostics();
            const importObj = parsePseudoImport(rule, '*', diagnostics);
            if (diagnostics.reports.map((report) => report.type !== 'info').length) {
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

    params += ` from ${JSON.stringify(importObj.request)};`;

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
