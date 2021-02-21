import type { NodeRenderer } from './types';

export interface DOMListRenderer<I, O extends Element, C extends Element = Element> {
    nodes: { [key: string]: O };
    render(container: C, data?: I[]): void;
}

export function createDOMListRenderer<I, O extends Element, C extends Element = Element>(
    nodeRenderer: NodeRenderer<I, O>
): DOMListRenderer<I, O, C> {
    let first: O | undefined;

    const nodes: { [key: string]: O } = {};

    const setNode = (dataItem: I, node: O) => (nodes[nodeRenderer.renderKey(dataItem)] = node);

    const renderNode = (dataItem: I) => {
        const key = nodeRenderer.renderKey(dataItem);
        const node = nodes[key];
        return node
            ? nodeRenderer.update(dataItem, node)
            : setNode(dataItem, nodeRenderer.create(dataItem, key));
    };

    const render = (container: C, data: I[] = []) => {
        if (data.length) {
            let node: O | undefined;
            let next: O | undefined = first;
            for (let i = 0; i < data.length; i++) {
                node = renderNode(data[i]);
                if (node !== next) {
                    container.insertBefore(node, next || null);
                } else {
                    next = node.nextElementSibling as O;
                }
            }
            first = nodes[nodeRenderer.renderKey(data[0])];

            while (node!.nextElementSibling) {
                if (nodeRenderer.hasKey(node!.nextElementSibling as O)) {
                    container.removeChild(node!.nextElementSibling);
                } else {
                    break;
                }
            }
        } else {
            while (first) {
                const next = first.nextElementSibling as O;
                container.removeChild(first);
                first = next && nodeRenderer.hasKey(next) ? next : undefined;
            }
        }
    };

    return { render, nodes };
}
