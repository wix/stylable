import { parseNamespace } from '@stylable/core/dist/features/st-namespace';
import type * as postcss from 'postcss';
import type { CodeMod } from './types';

export const namespaceToStNamespace: CodeMod = ({ ast }) => {
    let changed = false;
    let foundStNamespace = false;
    const nodesToMod: postcss.AtRule[] = [];
    ast.walkAtRules((atRule) => {
        if (atRule.name === 'namespace') {
            const namespace = parseNamespace(atRule);
            if (namespace) {
                nodesToMod.push(atRule);
            }
        } else if (atRule.name === 'st-namespace') {
            foundStNamespace = true;
        }
    });
    if (!foundStNamespace) {
        for (const atRule of nodesToMod) {
            atRule.name = 'st-namespace';
            changed = true;
        }
    }

    return {
        changed,
    };
};
