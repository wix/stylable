
const valueParser = require("postcss-value-parser");

export type MappedStates = { [s: string]: string | null };

export interface TypedClass {
    "-st-root"?: boolean;
    "-st-states"?: string[] | MappedStates;
    "-st-extends"?: string;
    "-st-variant"?: boolean;
}

export interface MixinValue<T = any[]> {
    type: string;
    options: T;
}

export const valueMapping = {
    from: '-st-from' as "-st-from",
    named: '-st-named' as "-st-named",
    default: '-st-default' as "-st-default",
    root: '-st-root' as "-st-root",
    states: '-st-states' as "-st-states",
    extends: '-st-extends' as "-st-extends",
    mixin: '-st-mixin' as "-st-mixin",
    variant: '-st-variant' as "-st-variant"
};

export type stKeys = keyof typeof valueMapping;

export const stValues: string[] = Object.keys(valueMapping).map((key: stKeys) => valueMapping[key]);

export const STYLABLE_VALUE_MATCHER = /^-st-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    "-st-root"(value: string) {
        return value === 'false' ? false : true;
    },
    "-st-variant"(value: string) {
        return value === 'false' ? false : true;
    },
    "-st-states"(value: string) {
        if (!value) {
            return {};
        }
        // if (value.indexOf('(') !== -1) {
        const mappedStates: MappedStates = {};
        const parts = value.split(/,?([\w-]+)(\(\"([^),]*)"\))?/g);
        for (let i = 0; i < parts.length; i += 4) {
            const stateName = parts[i + 1];
            const mapToSelector = parts[i + 3];
            if (stateName) {// ToDo: should check the selector has no operators and child
                mappedStates[stateName] = mapToSelector ? mapToSelector.trim() : null;
            }
        }
        return mappedStates;
        // } else {
        // return value.split(',').map((state) => state.trim());
        // }
    },
    "-st-extends"(value: string) {
        return value ? value.trim() : "";
    },
    "-st-named"(value: string) {
        var namedMap: { [key: string]: string } = {};
        value && value.split(',').forEach((name) => {
            const parts = name.trim().split(/\s+as\s+/);
            if (parts.length === 1) {
                namedMap[parts[0]] = parts[0];
            } else if (parts.length === 2) {
                namedMap[parts[1]] = parts[0];
            }
        });
        return namedMap;
    },
    "-st-mixin"(value: string) {

        const ast = valueParser(value);
        var mixins: { type: string, options: string[] }[] = [];
        ast.nodes.forEach((node: any) => {

            if (node.type === 'function') {

                const options = groupValues(node).map((nodes: any) => valueParser.stringify(nodes, (node: any) => {
                    if (node.type === 'div') {
                        return null;
                    } else if (node.type === 'string') {
                        return node.value;
                    } else {
                        return undefined;
                    }
                })).filter((x: string) => typeof x === 'string');

                mixins.push({
                    type: node.value,
                    options
                });

            } else if (node.type === 'word') {
                mixins.push({
                    type: node.value,
                    options: []
                })
            } else if (node.type === 'string') {
                //TODO: warn
            }
        });

        return mixins;

    }
}

function groupValues(node: any) {
    var grouped: any[] = [];
    var current: any[] = [];

    node.nodes.forEach((node: any) => {
        if (node.type === 'div') {
            grouped.push(current);
            current = [];
        } else {
            current.push(node);
        }
    });

    const last = grouped[grouped.length - 1];

    if ((last && last !== current && current.length) || !last && current.length) {
        grouped.push(current);
    }
    return grouped;
}