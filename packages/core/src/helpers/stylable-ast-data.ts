import type { RefedMixin } from '../stylable-meta';
import type * as postcss from 'postcss';

/**
 *  extended post css ast to contain extended selector and declaration value ast
 **/

type NodeData = RuleAstData | DeclAstData;
const astMap = new WeakMap<postcss.Node, NodeData>();

/**
 * retrieves cached ast data.
 * in case no data is found then new data will be generated and cached.
 **/
export function getStylableAstData<T extends postcss.Node>(
    node: T
): T extends postcss.Rule ? RuleAstData : T extends postcss.Declaration ? DeclAstData : null {
    if (isRule(node)) {
        if (!astMap.has(node)) {
            astMap.set(node, {});
        }
    } else if (isDeclaration(node)) {
        if (!astMap.has(node)) {
            astMap.set(node, {});
        }
    }
    return astMap.get(node) || (null as any);
}

export function setStylableAstData<N extends postcss.Rule, D extends Partial<RuleAstData>>(
    node: N,
    data: D
): void;
export function setStylableAstData<N extends postcss.Declaration, D extends Partial<DeclAstData>>(
    node: N,
    data: D
): void;
export function setStylableAstData<N extends postcss.Node, D extends NodeData>(
    node: N,
    data: D
): void {
    if (isRule(node) && isRuleAstData(data)) {
        astMap.set(node, { ...data });
    } else if (isDeclaration(node) && isDeclAstData(data)) {
        astMap.set(node, { ...data });
    }
}

export interface RuleAstData {
    mixins?: RefedMixin[];
    stScopeSelector?: string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeclAstData {
    // sourceValue: string ???
}

export function isRule(node: any): node is postcss.Rule {
    return node && node.type === `rule`;
}
export function isDeclaration(node: any): node is postcss.Declaration {
    return node && node.type === `declaration`;
}
export function isRuleAstData(node: any): node is RuleAstData {
    return node && Array.isArray(node.selectorAst);
}
export function isDeclAstData(node: any): node is DeclAstData {
    return !!node; // ???
}
