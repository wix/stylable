import { createFeature } from './feature';
import { plugableRecord } from '../helpers/plugable-record';
import { walkSelector } from '../helpers/selector';
import type { StylableMeta } from '../stylable-meta';
import type { SelectorNode } from '@tokey/css-selector-parser';

const dataKey = plugableRecord.key<Record<string, true>>();

// HOOKS

export const hooks = createFeature({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
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
