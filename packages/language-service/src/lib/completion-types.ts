import { valueMapping } from '@stylable/core';
import { ProviderRange } from './completion-providers';

export class Completion {
    constructor(
        public label: string,
        public detail: string = '',
        public sortText: string = 'd',
        public insertText: string | Snippet = label,
        public range: ProviderRange,
        public additionalCompletions: boolean = false,
        public triggerSignature: boolean = false
    ) {}
}

export class Snippet {
    constructor(public source: string) {}
}

export const importDirectives = {
    from: valueMapping.from,
    default: valueMapping.default,
    named: valueMapping.named
};

export const rulesetDirectives = {
    extends: valueMapping.extends,
    mixin: valueMapping.mixin,
    states: valueMapping.states
};

export const topLevelDirectives = {
    root: '.root' as '.root',
    namespace: '@namespace' as '@namespace',
    customSelector: '@custom-selector :--' as '@custom-selector :--',
    vars: ':vars' as ':vars',
    import: ':import' as ':import',
    stScope: '@st-scope' as '@st-scope'
};

// syntactic

export function importInternalDirective(type: keyof typeof importDirectives, rng: ProviderRange) {
    switch (importDirectives[type]) {
        case valueMapping.default:
            return new Completion(
                valueMapping.default + ':',
                'Default export name',
                'a',
                new Snippet(valueMapping.default + ': $1;'),
                rng
            );
        case valueMapping.from:
            return new Completion(
                valueMapping.from + ':',
                'Path to library',
                'a',
                new Snippet(valueMapping.from + ': "$1";'),
                rng
            );
        case valueMapping.named:
            return new Completion(
                valueMapping.named + ':',
                'Named export name',
                'a',
                new Snippet(valueMapping.named + ': $1;'),
                rng
            );
    }
}

export function rulesetInternalDirective(type: keyof typeof rulesetDirectives, rng: ProviderRange) {
    switch (rulesetDirectives[type]) {
        case valueMapping.extends:
            return new Completion(
                valueMapping.extends + ':',
                'Extend an external component',
                'a',
                new Snippet('-st-extends: $1;'),
                rng,
                true
            );
        case valueMapping.mixin:
            return new Completion(
                valueMapping.mixin + ':',
                'Apply mixins on the class',
                'a',
                new Snippet('-st-mixin: $1;'),
                rng,
                true
            );
        case valueMapping.states:
            return new Completion(
                valueMapping.states + ':',
                'Define the CSS states available for this class',
                'a',
                new Snippet('-st-states: $1;'),
                rng
            );
    }
}

export function topLevelDirective(type: keyof typeof topLevelDirectives, rng: ProviderRange) {
    switch (topLevelDirectives[type]) {
        case topLevelDirectives.import:
            return new Completion(
                topLevelDirectives.import,
                'Import an external library',
                'a',
                new Snippet(':import {\n\t-st-from: "$1";\n}$0'),
                rng
            );
        case topLevelDirectives.namespace:
            return new Completion(
                topLevelDirectives.namespace,
                'Declare a namespace for the file',
                'a',
                new Snippet('@namespace "$1";\n$0'),
                rng
            );
        case topLevelDirectives.customSelector:
            return new Completion(
                topLevelDirectives.customSelector.slice(0, -4),
                'Define a custom selector',
                'a',
                topLevelDirectives.customSelector,
                rng
            );
        case topLevelDirectives.root:
            return new Completion(topLevelDirectives.root, 'The root class', 'a', undefined, rng);
        case topLevelDirectives.vars:
            return new Completion(
                topLevelDirectives.vars,
                'Declare variables',
                'a',
                new Snippet(':vars {\n\t$1\n}$0'),
                rng
            );
        case topLevelDirectives.stScope:
            return new Completion(
                topLevelDirectives.stScope,
                'Define an @st-scope',
                'a',
                new Snippet('@st-scope $1 {\n\t$2\n}$0'),
                rng
            );
    }
}

export function valueDirective(rng: ProviderRange) {
    return new Completion(
        'value()',
        'Use the value of a variable',
        'a',
        new Snippet(' value($1)$0'),
        rng
    );
}

export function globalCompletion(rng: ProviderRange) {
    return new Completion(
        ':global()',
        'Target a global selector',
        'a',
        new Snippet(':global($0)'),
        rng
    );
}

// semantic
export function classCompletion(className: string, rng: ProviderRange, removeDot: boolean = false) {
    return new Completion(
        (removeDot ? '' : '.') + className,
        'Stylable class or tag',
        'a',
        undefined,
        rng
    );
}

export function extendCompletion(symbolName: string, from: string, rng: ProviderRange) {
    return new Completion(symbolName, 'from: ' + from, 'a', new Snippet(symbolName), rng);
}

export function namedCompletion(
    symbolName: string,
    rng: ProviderRange,
    from: string,
    value?: string
) {
    return new Completion(
        symbolName,
        'from: ' + from + '\n' + 'Value: ' + value,
        'a',
        new Snippet(symbolName),
        rng
    );
}

export function cssMixinCompletion(symbolName: string, rng: ProviderRange, from: string) {
    return new Completion(symbolName, 'from: ' + from, 'a', new Snippet(symbolName), rng);
}

export function codeMixinCompletion(symbolName: string, rng: ProviderRange, from: string) {
    return new Completion(
        symbolName,
        'from: ' + from,
        'a',
        new Snippet(symbolName + '($0)'),
        rng,
        false,
        true
    );
}

export function formatterCompletion(symbolName: string, rng: ProviderRange, from: string) {
    return new Completion(
        symbolName,
        'from: ' + from,
        'a',
        new Snippet(symbolName + '($0)'),
        rng,
        false,
        true
    );
}

export function pseudoElementCompletion(elementName: string, from: string, rng: ProviderRange) {
    return new Completion('::' + elementName, 'from: ' + from, 'a', '::' + elementName, rng);
}

export function stateTypeCompletion(type: string, from: string, rng: ProviderRange) {
    return new Completion(
        `${type}()`,
        `from: ${from}`,
        'a',
        new Snippet(`${type}($0)`),
        rng,
        false
    );
}

export function stateCompletion(
    stateName: string,
    from: string,
    rng: ProviderRange,
    type: string | null,
    hasParam?: boolean
) {
    return new Completion(
        ':' + stateName + (hasParam ? '()' : ''),
        'from: ' + from,
        'a',
        new Snippet(':' + stateName + (hasParam ? '($1)$0' : '')),
        rng,
        type === 'enum',
        hasParam
    );
}

export function stateEnumCompletion(option: string, from: string, rng: ProviderRange) {
    return new Completion(option, 'from: ' + from, 'a', new Snippet(option), rng, false);
}

export function valueCompletion(name: string, from: string, value: string, rng: ProviderRange) {
    return new Completion(
        name,
        'from: ' + from + '\n' + 'value: ' + value,
        'a',
        new Snippet(name),
        rng
    );
}
