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
                options = [];
                if(match[2]) {
                    const args:string = match[2];
                    let isInParam = false;
                    let isInString = false;
                    let lastIndex = 0;
                    let lastNoneSpaceIndex = 0;
                    for(let i = 0; i < args.length; ++i){
                        const currentChar = args[i];
                        if(currentChar.match(/\s/)){
                            if(!isInParam){
                                lastIndex = i + 1; // ignore  spaces before param
                            }
                            continue;
                        }
                        
                        switch(currentChar) {
                            case `"`:
                                if(isInParam) {

                                } else {
                                    isInParam = true;
                                    lastIndex = i + 1;
                                }
                                isInString = true;
                                lastNoneSpaceIndex = i + 1;
                                break;
                            case `,`:
                                if(isInString){
                                    const lastNoneSpaceChar = args[lastNoneSpaceIndex-1];
                                    if(lastNoneSpaceChar === `"`){
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
                    if(lastIndex < args.length){
                        if(isInParam){
                            lastNoneSpaceIndex = args[lastNoneSpaceIndex-1] === '"' ? lastNoneSpaceIndex - 1 : lastNoneSpaceIndex
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