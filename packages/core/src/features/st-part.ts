import { createFeature } from './feature';
import type { ElementSymbol } from './types';
import type { ClassSymbol } from './css-class';
import * as CSSClass from './css-class';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { ImmutableClass } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

export interface StylablePart {
    symbol: ClassSymbol | ElementSymbol;
    node: postcss.Rule | postcss.Root;
}

const dataKey = plugableRecord.key<Record<string, StylablePart>>();

export const diagnostics = {}

// HOOKS

export const hooks = createFeature({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
    },
    analyzeSelectorNode<AST extends ImmutableClass>(
        meta: StylableMeta,
        node: AST,
        rule: postcss.Rule
    ): void {
        if (node.type !== `class`) {
            throw new Error(`add STPart support for CSSElement feature`)
        }
        const stPartData = plugableRecord.getUnsafeAssure(meta.data, dataKey);
        const name = node.value;
        CSSClass.hooks.analyzeSelectorNode(meta, node, rule);
        if (!stPartData[name]) {
            // add explicit root declaration or first class declaration
            stPartData[name] = {
                node: rule,
                symbol: CSSClass.getClass(meta, name)!,
            };
            // deprecated
            meta.simpleSelectors[name] = stPartData[name];
        }
    }
});

// API

export function getPart(meta: StylableMeta, name: string): StylablePart | undefined {
    const state = plugableRecord.getUnsafeAssure(meta.data, dataKey);
    return (state[name] || /*deprecated*/ meta.simpleSelectors[name]);
}
