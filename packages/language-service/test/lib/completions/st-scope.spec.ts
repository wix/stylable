import { createRange } from '../../../src/lib/completion-providers';
import * as asserters from '../../../test-kit/completions-asserters';
import { Completion, rulesetDirectives } from 'packages/language-service/src/lib/completion-types';
import { expect } from 'chai';

describe('completion inside @st-scope', () => {
    describe('stylable variables', () => {
        describe('value()', () => {
            'value('.split('').map((_c, i) => {
                const prefix = 'value('.slice(0, i);

                it('should be completed inside rule value, with prefix ' + prefix + ' ', () => {
                    const asserter = asserters.getCompletions('st-scope/local-vars.st.css', prefix);
                    asserter.suggested([asserters.valueDirective(createRange(9, 14, 9, 15 + i))]);
                });
            });
        });

        describe('Inside value()', () => {
            const str1 = 'color1';
            const str2 = 'color2';

            str1.split('').forEach((_c, i) => {
                const prefix = str1.slice(0, i);
                it('Local variables should be completed, with prefix ' + prefix + ' ', () => {
                    const asserter = asserters.getCompletions(
                        'st-scope/inside-value-local-vars.st.css',
                        prefix
                    );
                    asserter.suggested([
                        asserters.valueCompletion(
                            str1,
                            createRange(9, 31, 9, 31 + i),
                            'red',
                            'Local variable'
                        ),
                        asserters.valueCompletion(
                            str2,
                            createRange(9, 31, 9, 31 + i),
                            'blue',
                            'Local variable'
                        )
                    ]);
                });
            });
        });
    });

    describe('st-directives', () => {
        describe('should complete -st-extends inside simple selector ruleset ', () => {
            rulesetDirectives.extends.split('').map((_c: string, i: number) => {
                const prefix = rulesetDirectives.extends.slice(0, i);
                it(' with Prefix: ' + prefix + ' ', () => {
                    const asserter = asserters.getCompletions('st-scope/directive.st.css', prefix);
                    asserter.suggested([
                        asserters.extendsDirectiveCompletion(createRange(4, 8, 4, 8 + i))
                    ]);
                });
            });
        });

        describe('should complete -st-mixin inside simple selector ruleset ', () => {
            rulesetDirectives.mixin.split('').map((_c: string, i: number) => {
                const prefix = rulesetDirectives.mixin.slice(0, i);
                it(' with Prefix: ' + prefix + ' ', () => {
                    const asserter = asserters.getCompletions('st-scope/directive.st.css', prefix);
                    asserter.suggested([
                        asserters.mixinDirectiveCompletion(createRange(4, 8, 4, 8 + i))
                    ]);
                });
            });
        });

        describe('should complete -st-states inside simple selector ruleset ', () => {
            rulesetDirectives.states.split('').map((_c: string, i: number) => {
                const prefix = rulesetDirectives.states.slice(0, i);
                it(' with Prefix: ' + prefix + ' ', () => {
                    const asserter = asserters.getCompletions('st-scope/directive.st.css', prefix);
                    asserter.suggested([
                        asserters.statesDirectiveCompletion(createRange(4, 8, 4, 8 + i))
                    ]);
                });
            });
        });
    });

    describe(':global', () => {
        const str = ':global()';

        str.split('').forEach((_c, i) => {
            const prefix = str.slice(0, i);
            it(
                'should not suggest globals in declaration properties inside a ruleset' + prefix,
                () => {
                    const rng = createRange(4, 8, 4, 8 + i);
                    const asserter = asserters.getCompletions('st-scope/directive.st.css', prefix);
                    const exp: Array<Partial<Completion>> = [];
                    exp.push(asserters.globalCompletion(rng));
                    asserter.notSuggested(exp);
                }
            );
        });
    });

    describe('css service', () => {
        it('should not suggest selector parts in declaration properties inside a ruleset', () => {
            const actual = asserters.getStylableAndCssCompletions('st-scope/directive.st.css');

            expect(actual.find(comp => comp.label === '.root')).to.eql(undefined);
        });

        it('should suggest declaration properties inside a ruleset', () => {
            const actual = asserters.getStylableAndCssCompletions('st-scope/directive.st.css');

            expect(actual.find(comp => comp.label === 'color')).to.deep.include({
                label: 'color',
                documentation: "Color of an element's text\n\nSyntax: <color>",
                textEdit: {
                    range: createRange(4, 8, 4, 8),
                    newText: 'color: '
                },
                kind: 10,
                command: {
                    title: 'Suggest',
                    command: 'editor.action.triggerSuggest'
                },
                sortText: 'd'
            });
        });

        it('should suggest local class in the beginning of a ruleset', () => {
            const actual = asserters.getStylableAndCssCompletions('st-scope/selector.st.css');

            expect(actual.find(comp => comp.label === '.part')).to.deep.include({
                label: '.part',
                detail: 'Stylable class or tag',
                textEdit: {
                    range: createRange(4, 4, 4, 4),
                    newText: '.part'
                },
                sortText: 'a',
                filterText: '.part'
            });
        });
    });
});
