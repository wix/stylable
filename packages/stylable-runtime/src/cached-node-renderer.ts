import { RenderableStylesheet, NodeRenderer } from "./types";

export interface CachedNodeRendererOptions {
    createElement: typeof document.createElement
    attrKey: string
}

export class CacheStyleNodeRenderer implements NodeRenderer<RenderableStylesheet, HTMLStyleElement> {
    constructor(private options: CachedNodeRendererOptions){}
    create = (stylesheet: RenderableStylesheet, key: string) => {
        const node = this.options.createElement("style");
        node.textContent = stylesheet.$css || '';
        node.setAttribute(this.options.attrKey, key);
        node.setAttribute("st-depth", stylesheet.$depth + '');
        return node;
    };
    hasKey = (node: HTMLStyleElement) => node.hasAttribute(this.options.attrKey);
    update = (stylesheet: RenderableStylesheet, node: HTMLStyleElement) => {
        if (node.textContent !== stylesheet.$css) {
            node.textContent = stylesheet.$css || '';
        }
        return node;
    };
    renderKey = (stylesheet: RenderableStylesheet) => stylesheet.$id;
}
