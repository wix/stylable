export type MappedStates = { [s: string]: string | null };

export interface TypedClass {
    "-st-root"?: boolean;
    "-st-states"?: string[] | MappedStates;
    "-st-extends"?: string;
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
    mixin: '-st-mixin' as "-st-mixin"
};

export type stKeys = keyof typeof valueMapping;

export const stValues: string[] = Object.keys(valueMapping).map((key: stKeys) => valueMapping[key]);

export const STYLABLE_VALUE_MATCHER = /^-st-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    "-st-root"(value: string) {
        return value === 'false' ? false : true
    },
    "-st-states"(value: string) {
        if (!value) {
            return [];
        }
        if (value.indexOf('(') !== -1) {
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
        } else {
            return value.split(',').map((state) => state.trim());
        }
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

        const parts = value.match(/\s*[A-Za-z$_][$_\w]*\(.*?\)\)?|\s*([A-Za-z$_][$_\w]*\s*)/g);
        if (!parts || parts.join('').length !== value.replace(/\s*/, '').length) {
            throw new Error(valueMapping.mixin + ': not a valid mixin value: ' + value);
        }

        return parts.map((mix) => {
            let type: string, options: string[], match;

            if (mix.indexOf('(') === -1) {
                type = mix.trim();
                options = [];
            } else if (match = mix.match(/(.*?)\((.*?\)?)\)/)) {
                type = match[1].trim();
                options = [];
                if (match[2]) {
                    const args: string = match[2];
                    let isInParam = false;
                    let isInString = false;
                    let lastIndex = 0;
                    let lastNoneSpaceIndex = 0;
                    for (let i = 0; i < args.length; ++i) {
                        const currentChar = args[i];
                        if (currentChar.match(/\s/)) {
                            if (!isInParam) {
                                lastIndex = i + 1; // ignore  spaces before param
                            }
                            continue;
                        }

                        switch (currentChar) {
                            case `"`:
                                if (isInParam) {

                                } else {
                                    isInParam = true;
                                    lastIndex = i + 1;
                                }
                                isInString = true;
                                lastNoneSpaceIndex = i + 1;
                                break;
                            case `,`:
                                if (isInString) {
                                    const lastNoneSpaceChar = args[lastNoneSpaceIndex - 1];
                                    if (lastNoneSpaceChar === `"`) {
                                        lastNoneSpaceIndex = lastNoneSpaceIndex - 1;
                                    } else {
                                        lastNoneSpaceIndex = lastNoneSpaceIndex + 1;
                                        continue;
                                    }
                                }
                                options.push(args.slice(lastIndex, lastNoneSpaceIndex))
                                isInParam = false;
                                isInString = false;
                                lastIndex = i + 1;
                                lastNoneSpaceIndex = i + 1;
                                break;
                            default:
                                isInParam = true;
                                lastNoneSpaceIndex = i + 1;
                        }
                    }
                    if (lastIndex < args.length) {
                        if (isInParam) {
                            lastNoneSpaceIndex = args[lastNoneSpaceIndex - 1] === '"' ? lastNoneSpaceIndex - 1 : lastNoneSpaceIndex
                        }
                        options.push(args.slice(lastIndex, lastNoneSpaceIndex));
                    }
                }
            } else {
                throw new Error('Invalid mixin call:' + mix);
            }
            return { type, options }
        });

    }
}