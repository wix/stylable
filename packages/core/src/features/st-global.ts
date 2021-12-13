import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import { walkSelector } from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import type { SelectorNode } from '@tokey/css-selector-parser';

const dataKey = plugableRecord.key<Record<string, true>>('globals');

// HOOKS

export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {});
    },
});

// API

export function addGlobals(meta: StylableMeta, selectorAst: SelectorNode[]) {
    for (const ast of selectorAst) {
        walkSelector(ast, (inner) => {
            if (inner.type === 'class') {
                meta.globals[inner.value] = true;
            }
        });
    }
}
