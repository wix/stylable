import path from 'path';
import fs from '@file-services/node';
import { expect } from 'chai';
import type { ProviderRange } from '@stylable/language-service/dist/lib/completion-providers';
import { Completion, Snippet } from '@stylable/language-service/dist/lib/completion-types';
import { CASES_PATH, stylableLSP } from './stylable-fixtures-lsp';
import { LangServiceContext } from '@stylable/language-service/dist/lib-new/lang-service-context';

function assertPresent(
    actualCompletions: Completion[],
    expectedCompletions: Array<Partial<Completion>>,
    prefix = ''
) {
    expectedCompletions.forEach((expected) => {
        const actual = actualCompletions.find((comp) => comp.label === expected.label);
        expect(
            actual,
            'Completion not found: ' + expected.label + ' ' + 'with prefix ' + prefix + ' '
        ).to.not.be.equal(undefined);
        if (actual) {
            for (const field in expected) {
                if (!Object.prototype.hasOwnProperty.call(expected, field)) {
                    continue;
                }
                let actualVal: any = (actual as any)[field];
                if (actualVal instanceof Snippet) {
                    actualVal = actualVal.source;
                }
                const expectedVal: any = (expected as any)[field];
                expect(
                    actualVal,
                    'Field value mismatch: ' +
                        actual.label +
                        ':' +
                        field +
                        ' with prefix ' +
                        prefix +
                        ' '
                ).to.eql(expectedVal);
            }
        }
    });
}

function assertNotPresent(
    actualCompletions: Completion[],
    nonCompletions: Array<Partial<Completion>>,
    prefix = ''
) {
    nonCompletions.forEach((notAllowed) => {
        const actual = actualCompletions.find(
            (comp) =>
                comp.label === notAllowed.label &&
                !!notAllowed.range &&
                comp.range.start.line === notAllowed.range.start.line &&
                comp.range.start.character === notAllowed.range.start.character &&
                comp.range.end.line === notAllowed.range.end.line &&
                comp.range.end.character === notAllowed.range.end.character
        );
        expect(
            actual,
            prefix + 'unallowed completion found: ' + notAllowed.label + ' '
        ).to.be.equal(undefined);
    });
}

export function getCompletions(fileName: string, prefix = '') {
    const fullPath = path.join(CASES_PATH, fileName);
    const src: string = fs.readFileSync(fullPath).toString();
    const stat = fs.statSync(fullPath);
    const offset = src.indexOf('|') + prefix.length;
    const context = new LangServiceContext(
        fs,
        stylableLSP.getStylable(),
        {
            path: fullPath,
            stat,
            content: src.replace('|', prefix),
        },
        offset
    );

    const completions = stylableLSP.provideCompletionItemsFromSrc(context);

    return {
        completions,
        suggested: (expectedCompletions: Array<Partial<Completion>>) => {
            assertPresent(completions, expectedCompletions, prefix);
        },
        notSuggested: (expectedNoCompletions: Array<Partial<Completion>>) => {
            assertNotPresent(completions, expectedNoCompletions);
        },
    };
}

export function getStylableAndCssCompletions(fileName: string) {
    const fullPath = path.join(CASES_PATH, fileName);
    const src: string = fs.readFileSync(fullPath).toString();
    const stat = fs.statSync(fullPath);
    const offset = src.indexOf('|');
    const context = new LangServiceContext(
        fs,
        stylableLSP.getStylable(),
        {
            path: fullPath,
            stat,
            content: src.replace('|', ''),
        },
        offset
    );
    return stylableLSP.getCompletions(context);
}

// syntactic
// at-rules
export const customSelectorDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (
    rng
) => {
    return {
        label: '@custom-selector',
        detail: 'Define a custom selector',
        sortText: 'a',
        insertText: '@custom-selector :--',
        range: rng,
    };
};
export const stScopeDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '@st-scope',
        detail: 'Define an @st-scope',
        sortText: 'a',
        insertText: '@st-scope $1 {\n\t$2\n}',
        range: rng,
    };
};
export const namespaceDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '@st-namespace',
        detail: 'Declare a namespace for the file',
        sortText: 'a',
        insertText: '@st-namespace "$1";\n',
        range: rng,
    };
};
export const stImportDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '@st-import',
        detail: 'Define an @st-import',
        sortText: 'a',
        insertText: '@st-import $2 from "$1";',
        range: rng,
    };
};
export const stGlobalCustomPropertyCompletion: (rng: ProviderRange) => Partial<Completion> = (
    rng
) => {
    return {
        label: '@st-global-custom-property',
        detail: 'Define global custom properties using @st-global-custom-property',
        sortText: 'a',
        insertText: '@st-global-custom-property --$1;',
        range: rng,
    };
};

// rules
export const globalCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return new Completion(':global()', 'Target a global selector', 'a', ':global($1)', rng);
};
export const varsDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: ':vars',
        detail: 'Declare variables',
        sortText: 'a',
        insertText: ':vars {\n\t$1\n}',
        range: rng,
    };
};
export const importDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: ':import',
        detail: 'Import an external library',
        sortText: 'a',
        insertText: ':import {\n\t-st-from: "$1";\n}',
        range: rng,
    };
};
export const rootClassCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '.root',
        detail: 'The root class',
        sortText: 'a',
        insertText: '.root',
        range: rng,
    };
};

// declarations
export const importDefaultDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (
    rng
) => {
    return {
        label: '-st-default:',
        detail: 'Default export name',
        sortText: 'a',
        insertText: '-st-default: $1;',
        range: rng,
    };
};
export const importFromDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '-st-from:',
        detail: 'Path to library',
        sortText: 'a',
        insertText: '-st-from: "$1";',
        range: rng,
    };
};
export const importNamedDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (
    rng
) => {
    return {
        label: '-st-named:',
        detail: 'Named export name',
        sortText: 'a',
        insertText: '-st-named: $1;',
        range: rng,
    };
};
export const extendsDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '-st-extends:',
        detail: 'Extend an external component',
        sortText: 'a',
        insertText: '-st-extends: $1;',
        additionalCompletions: true,
        range: rng,
    };
};
export const statesDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '-st-states:',
        detail: 'Define the CSS states available for this class',
        sortText: 'a',
        insertText: '-st-states: $1;',
        range: rng,
    };
};
export const mixinDirectiveCompletion: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: '-st-mixin:',
        detail: 'Apply mixins on the class',
        sortText: 'a',
        insertText: '-st-mixin: $1;',
        range: rng,
    };
};
export const valueDirective: (rng: ProviderRange) => Partial<Completion> = (rng) => {
    return {
        label: 'value()',
        detail: 'Use the value of a variable',
        sortText: 'a',
        insertText: ' value($1)',
        range: rng,
    };
};

// semantic
export const classCompletion: (
    className: string,
    rng: ProviderRange,
    isDefaultImport?: boolean
) => Partial<Completion> = (className, rng, isDefaultImport?) => {
    return { label: (isDefaultImport ? '' : '.') + className, sortText: 'a', range: rng };
};
export const extendsCompletion: (
    typeName: string,
    rng: ProviderRange,
    from: string
) => Partial<Completion> = (typeName, rng, from) => {
    return {
        label: typeName,
        sortText: 'a',
        insertText: typeName,
        detail: 'from: ' + from,
        range: rng,
    };
};
export const namedCompletion: (
    typeName: string,
    rng: ProviderRange,
    from: string,
    value?: string
) => Partial<Completion> = (typeName, rng, from, value?) => {
    return {
        label: typeName,
        sortText: 'a',
        insertText: typeName,
        detail: 'from: ' + from + '\n' + 'Value: ' + value,
        range: rng,
    };
};
export const cssMixinCompletion: (
    symbolName: string,
    rng: ProviderRange,
    from: string
) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(symbolName, 'from: ' + from, 'a', symbolName, rng);
};
export const codeMixinCompletion: (
    symbolName: string,
    rng: ProviderRange,
    from: string
) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(symbolName, 'from: ' + from, 'a', symbolName + '($1)', rng, false, true);
};
export const formatterCompletion: (
    symbolName: string,
    rng: ProviderRange,
    from: string
) => Partial<Completion> = (symbolName, rng, from) => {
    return new Completion(
        symbolName,
        'from: ' + from,
        'a',
        new Snippet(symbolName + '($1)'),
        rng,
        false,
        true
    );
};
export const stateTypeDefinitionCompletion: (
    type: string,
    rng: ProviderRange,
    from?: string
) => Partial<Completion> = (type, rng, from = 'Stylable pseudo-class types') => {
    return {
        label: `${type}()`,
        sortText: 'a',
        detail: `from: ${from}`,
        insertText: `${type}($1)`,
        range: rng,
    };
};
export const stateValidatorDefinitionCompletion: (
    validator: string,
    rng: ProviderRange,
    type: string,
    from?: string
) => Partial<Completion> = (
    validator,
    rng,
    type,
    from = `Stylable pseudo-class ${type} validators`
) => {
    return {
        label: `${validator}()`,
        sortText: 'a',
        detail: `from: ${from}`,
        insertText: `${validator}($1)`,
        range: rng,
    };
};
export const stateSelectorCompletion: (
    stateName: string,
    rng: ProviderRange,
    from?: string,
    hasParam?: boolean
) => Partial<Completion> = (stateName, rng, from = 'Local file', hasParam = false) => {
    return {
        label: ':' + stateName + (hasParam ? '()' : ''),
        sortText: 'a',
        detail: 'from: ' + from,
        insertText: ':' + stateName + (hasParam ? '($1)' : ''),
        range: rng,
        triggerSignature: hasParam,
    };
};
export const stateEnumCompletion: (
    option: string,
    rng: ProviderRange,
    from?: string
) => Partial<Completion> = (option, rng, from = 'Local file') => {
    return {
        label: option,
        sortText: 'a',
        detail: 'from: ' + from,
        insertText: option,
        range: rng,
    };
};
export const pseudoElementCompletion: (
    elementName: string,
    rng: ProviderRange,
    from?: string
) => Partial<Completion> = (elementName, rng, from?) => {
    return {
        label: '::' + elementName,
        sortText: 'a',
        detail: 'from: ' + from,
        insertText: '::' + elementName,
        range: rng,
    };
};
export const valueCompletion: (
    name: string,
    rng: ProviderRange,
    value: string,
    from: string
) => Partial<Completion> = (name, rng, value, from) => {
    return {
        label: name,
        sortText: 'a',
        detail: 'from: ' + from + '\n' + 'value: ' + value,
        insertText: name,
        range: rng,
    };
};
