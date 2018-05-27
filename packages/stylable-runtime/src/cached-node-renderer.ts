import { RuntimeStylesheet, NodeRenderer } from "./types";

export interface CachedNodeRendererOptions {
    createElement: typeof document.createElement
    attrKey: string
}

export function createCacheStyleNodeRenderer(
    options: CachedNodeRendererOptions
): NodeRenderer<RuntimeStylesheet, HTMLStyleElement> {

    const { createElement, attrKey = "stylable-key" } = options;

    const create = (stylesheet: RuntimeStylesheet, key: string) => {
        const node = createElement("style");
        node.textContent = stylesheet.$css || '';
        node.setAttribute(attrKey, key);
        node.setAttribute("st-depth", stylesheet.$depth + '');
        return node;
    };

    const update = (stylesheet: RuntimeStylesheet, node: HTMLStyleElement) => {
        if (node.textContent !== stylesheet.$css) {
            node.textContent = stylesheet.$css || '';
        }
        return node;
    };

    const renderKey = (stylesheet: RuntimeStylesheet) => stylesheet.$id;

    const hasKey = (node: HTMLStyleElement) => node.hasAttribute(attrKey);

    return {
        update,
        create,
        renderKey,
        hasKey
    };
}
