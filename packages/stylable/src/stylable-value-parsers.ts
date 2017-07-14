

export interface TypedClass {
    "-sb-root"?: boolean;
    "-sb-states"?: string[];
    "-sb-type"?: string;
}

export interface MixinValue<T = {}> {
    type: string;
    options: T;
}

export const valueMapping = {
    from: '-sb-from' as "-sb-from",
    named: '-sb-named' as "-sb-named",
    default: '-sb-default' as "-sb-default",
    root: '-sb-root' as "-sb-root",
    states: '-sb-states' as "-sb-states",
    type: '-sb-type' as "-sb-type",
    mixin: '-sb-mixin' as "-sb-mixin"
};

export const STYLABLE_VALUE_MATCHER = /^-sb-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    "-sb-root"(value: string) {
        return value === 'false' ? false : true
    },
    "-sb-states"(value: string) {
        return value ? value.split(',').map((state) => state.trim()) : [];
    },
    "-sb-type"(value: string) {
        return value ? value.trim() : "";
    },
    "-sb-mixin"(value: string) {

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
                options = match[2] ? match[2].split(',').map(x => x.trim()) : [];
            } else {
                throw new Error('Invalid mixin call:' + mix);
            }
            return { type, options }
        });

    }
}