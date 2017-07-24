export interface TypedClass {
    "-st-root"?: boolean;
    "-st-states"?: string[];
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

export const STYLABLE_VALUE_MATCHER = /^-st-/;
export const STYLABLE_NAMED_MATCHER = new RegExp(`^${valueMapping.named}-(.+)`);

export const SBTypesParsers = {
    "-st-root"(value: string) {
        return value === 'false' ? false : true
    },
    "-st-states"(value: string) {
        return value ? value.split(',').map((state) => state.trim()) : [];
    },
    "-st-extends"(value: string) {
        return value ? value.trim() : "";
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
                options = match[2] ? match[2].split(',').map(x => x.trim()) : [];
            } else {
                throw new Error('Invalid mixin call:' + mix);
            }
            return { type, options }
        });

    }
}