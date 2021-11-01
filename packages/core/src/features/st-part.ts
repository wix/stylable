import { createFeature, SelectorNodeContext } from './feature';
import type { ClassSymbol } from './css-class';
import type { ElementSymbol } from './css-type';
import * as CSSClass from './css-class';
import * as CSSType from './css-type';
import { plugableRecord } from '../helpers/plugable-record';
import type { StylableMeta } from '../stylable-meta';
import type { ImmutableClass, ImmutableType } from '@tokey/css-selector-parser';
import type * as postcss from 'postcss';

export interface StylablePart {
    symbol: ClassSymbol | ElementSymbol;
    node: postcss.Rule | postcss.Root;
}

const dataKey = plugableRecord.key<Record<string, StylablePart>>();

export const diagnostics = {};

// HOOKS

export const hooks = createFeature({
    analyzeInit({ data }) {
        plugableRecord.set(data, dataKey, {});
    },
    analyzeSelectorNode<AST extends ImmutableClass | ImmutableType>(
        meta: StylableMeta,
        node: AST,
        rule: postcss.Rule,
        nodeContext: SelectorNodeContext
    ): void {
        const stPartData = plugableRecord.getUnsafeAssure(meta.data, dataKey);
        const name = node.value;
        if (node.type === `class`) {
            CSSClass.hooks.analyzeSelectorNode(meta, node, rule);
        } else {
            CSSType.hooks.analyzeSelectorNode(meta, node, rule, nodeContext);
        }
        if (!stPartData[name]) {
            const symbol =
                node.type === `class` ? CSSClass.getClass(meta, name) : CSSType.getType(meta, name);
            if (!symbol) {
                return;
            }
            stPartData[name] = {
                node: rule,
                symbol,
            };
            // deprecated
            meta.simpleSelectors[name] = stPartData[name];
        }
    },
});

// API

export function getPart(meta: StylableMeta, name: string): StylablePart | undefined {
    const state = plugableRecord.getUnsafeAssure(meta.data, dataKey);
    return state[name];
}
