export interface SelectorAstNode {
    type: string;
    name: string;
    nodes: SelectorAstNode[];
    content?: string;
    before?: string;
    value?: string;
}
export interface PseudoSelectorAstNode extends SelectorAstNode {
    type: 'pseudo-class';
    content: string;
}
export declare type Visitor = (node: SelectorAstNode, index: number, nodes: SelectorAstNode[]) => boolean | void;
export declare function parseSelector(selector: string): SelectorAstNode;
export declare function stringifySelector(ast: SelectorAstNode): string;
export declare function traverseNode(node: SelectorAstNode, visitor: Visitor, index?: number, nodes?: SelectorAstNode[]): boolean | void;
export declare function createChecker(types: Array<string | string[]>): () => (node: SelectorAstNode) => boolean;
export declare function createRootAfterSpaceChecker(): (node?: SelectorAstNode | undefined) => boolean;
export declare const createSimpleSelectorChecker: () => (node: SelectorAstNode) => boolean;
export declare function isImport(ast: SelectorAstNode): boolean;
export declare function matchAtKeyframes(selector: string): RegExpMatchArray | null;
export declare function matchAtMedia(selector: string): RegExpMatchArray | null;
