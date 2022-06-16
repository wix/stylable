// MDN reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
export const nativePseudoClasses = [
    'active',
    'any',
    'any-link',
    'checked',
    'default',
    'defined',
    'dir',
    'disabled',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'focus',
    'focus-within',
    'focus-visible',
    'has',
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is',
    'lang',
    'last-child',
    'last-of-type',
    'left',
    'link',
    'not',
    'nth-child',
    'nth-last-child',
    'nth-last-of-type',
    'nth-of-type',
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'valid',
    'visited',
    'where',
];

export const CSSWideKeywords = ['initial', 'inherit', 'unset'];

/**
 * list names of functional pseudo classes
 * - cannot be overridden by custom states
 * - might contain nested selectors
 */
export const reservedFunctionalPseudoClasses = [
    `not`,
    `any`,
    `matches`,
    `is`,
    `where`,
    `has`,
    `host`,
    `host-context`,
    `nth-child`,
    `nth-last-child`,
    `nth-of-type`,
    `nth-last-of-type`,
    // not native
    `global`,
    `local`,
];
export const knownPseudoClassesWithNestedSelectors = reservedFunctionalPseudoClasses.filter(
    (name) => {
        switch (name) {
            case `global`:
            case `local`:
            case `nth-of-type`:
            case `nth-last-of-type`:
                return false;
        }
        return true;
    }
);

export const nativePseudoElements = [
    'after',
    'backdrop',
    'before',
    'cue',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error',
];

export const nativeFunctionsDic = {
    annotation: true,
    attr: true,
    blur: true,
    brightness: true,
    calc: true,
    'character-variant': true,
    circle: true,
    clamp: true,
    'conic-gradient': true,
    constant: true,
    contrast: true,
    counter: true,
    counters: true,
    'cubic-bezier': true,
    'drop-shadow': true,
    ellipse: true,
    env: true,
    'fit-content': true,
    format: true,
    grayscale: true,
    hsl: true,
    hsla: true,
    'hue-rotate': true,
    hwb: true,
    image: true,
    inset: true,
    invert: true,
    leader: true,
    'linear-gradient': true,
    local: true,
    matrix: true,
    matrix3d: true,
    max: true,
    min: true,
    minmax: true,
    opacity: true,
    ornaments: true,
    paint: true,
    path: true,
    perspective: true,
    polygon: true,
    'radial-gradient': true,
    rect: true,
    repeat: true,
    'repeating-linear-gradient': true,
    'repeating-radial-gradient': true,
    'repeating-conic-gradient': true,
    rgb: true,
    rgba: true,
    rotate: true,
    rotate3d: true,
    rotateX: true,
    rotateY: true,
    rotateZ: true,
    saturate: true,
    scale: true,
    scale3d: true,
    scaleX: true,
    scaleY: true,
    scaleZ: true,
    sepia: true,
    skew: true,
    skewX: true,
    skewY: true,
    steps: true,
    styleset: true,
    stylistic: true,
    swash: true,
    symbols: true,
    translate: true,
    translate3d: true,
    translateX: true,
    translateY: true,
    translateZ: true,
    url: true,
    var: true,
};

export type nativeFunctions = keyof typeof nativeFunctionsDic;
export function isCssNativeFunction(name: string): name is nativeFunctions {
    return nativeFunctionsDic[name as nativeFunctions];
}
