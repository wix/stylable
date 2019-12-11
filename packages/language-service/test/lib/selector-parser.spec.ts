import { expect } from 'chai';
import { parseSelector, SelectorInternalChunk } from '../../src/lib/utils/selector-analyzer';

describe('Selector Parser', () => {
    let sel: string;

    sel = 'div.simple:withState:andAnother';
    sel.split(/\.|:+/).forEach((sub, i) => {
        const tested = sel.slice(0, sel.indexOf(sub) + sub.length);
        it('Parses a selector with element and class - selector string:   ' + tested + '  ', () => {
            const { selector: parsed } = parseSelector(tested);

            expect(parsed.length).to.equal(1);
            expect((parsed[0] as SelectorInternalChunk).customSelectors).to.eql([]);
            expect((parsed[0] as SelectorInternalChunk).type).to.equal('div');
            expect((parsed[0] as SelectorInternalChunk).classes).to.eql(i === 0 ? [] : ['simple']);
            expect((parsed[0] as SelectorInternalChunk).states).to.eql(
                i <= 1 ? [] : i === 2 ? ['withState'] : ['withState', 'andAnother']
            );
        });
    });

    sel = '.not-so.simple:withState:andAnother';
    sel.split(/\.|:+/).forEach((sub, i) => {
        if (i === 0) {
            return;
        }
        const tested = sel.slice(0, sel.indexOf(sub) + sub.length);
        it('Parses a selector with two classes - selector string:   ' + tested + '  ', () => {
            const { selector: parsed } = parseSelector(tested);

            expect(parsed.length).to.equal(1);
            expect((parsed[0] as SelectorInternalChunk).customSelectors).to.eql([]);
            expect((parsed[0] as SelectorInternalChunk).type).to.equal('*');
            expect((parsed[0] as SelectorInternalChunk).classes).to.eql(
                i <= 1 ? ['not-so'] : ['not-so', 'simple']
            );
            expect((parsed[0] as SelectorInternalChunk).states).to.eql(
                i <= 2 ? [] : i === 3 ? ['withState'] : ['withState', 'andAnother']
            );
        });
    });

    sel = '.first::second:someState::third';
    sel.split(/\.|:+/).forEach((sub, i) => {
        if (i === 0) {
            return;
        }
        const tested = sel.slice(0, sel.indexOf(sub) + sub.length);
        it(
            'Parses a multi-level selector with states - selector string:   ' + tested + '   ',
            () => {
                const { selector: parsed } = parseSelector(tested);

                expect(parsed.length).to.equal(i <= 2 ? i : i === 3 ? 2 : 3);
                expect((parsed[0] as SelectorInternalChunk).customSelectors).to.eql([]);
                expect((parsed[0] as SelectorInternalChunk).type).to.equal('*');
                expect((parsed[0] as SelectorInternalChunk).classes).to.eql(['first']);
                expect((parsed[0] as SelectorInternalChunk).states).to.eql([]);

                if (i >= 2) {
                    expect((parsed[1] as SelectorInternalChunk).customSelectors).to.eql([]);
                    expect((parsed[1] as SelectorInternalChunk).type).to.equal('second');
                    expect((parsed[1] as SelectorInternalChunk).classes).to.eql([]);
                    expect((parsed[1] as SelectorInternalChunk).states).to.eql(
                        i === 2 ? [] : ['someState']
                    );
                }
                if (i === 4) {
                    expect((parsed[2] as SelectorInternalChunk).customSelectors).to.eql([]);
                    expect((parsed[2] as SelectorInternalChunk).type).to.equal('third');
                    expect((parsed[2] as SelectorInternalChunk).classes).to.eql([]);
                    expect((parsed[2] as SelectorInternalChunk).states).to.eql([]);
                }
            }
        );
    });

    sel = ':--custom:hover::inner::deep';
    sel.split(/\.|:+/).forEach((sub, i) => {
        if (i === 0) {
            return;
        }
        const tested = sel.slice(0, sel.indexOf(sub) + sub.length);
        it(
            'Parses a multi-level selector with custom selector - selector string:   ' +
                tested +
                '   ',
            () => {
                const { selector: parsed } = parseSelector(tested);

                expect(parsed.length).to.equal(i <= 2 ? 1 : i - 1);
                expect((parsed[0] as SelectorInternalChunk).customSelectors).to.eql([':--custom']);
                expect((parsed[0] as SelectorInternalChunk).type).to.equal('*');
                expect((parsed[0] as SelectorInternalChunk).classes).to.eql([]);
                expect((parsed[0] as SelectorInternalChunk).states).to.eql(
                    i === 1 ? [] : ['hover']
                );

                if (i >= 3) {
                    expect((parsed[1] as SelectorInternalChunk).customSelectors).to.eql([]);
                    expect((parsed[1] as SelectorInternalChunk).type).to.equal('inner');
                    expect((parsed[1] as SelectorInternalChunk).classes).to.eql([]);
                    expect((parsed[1] as SelectorInternalChunk).states).to.eql([]);
                }
                if (i === 4) {
                    expect((parsed[2] as SelectorInternalChunk).customSelectors).to.eql([]);
                    expect((parsed[2] as SelectorInternalChunk).type).to.equal('deep');
                    expect((parsed[2] as SelectorInternalChunk).classes).to.eql([]);
                    expect((parsed[2] as SelectorInternalChunk).states).to.eql([]);
                }
            }
        );
    });

    it('Returns last selectoid', () => {
        const tested = '.lala::baba:ff';
        const { lastSelector } = parseSelector(tested);
        expect(lastSelector).to.equal(':ff');
    });

    it('Does not return first selectoid', () => {
        const tested = '.lala';
        const { lastSelector } = parseSelector(tested);
        expect(lastSelector).to.equal('');
    });

    it('Does not return pseudo element', () => {
        const tested = '.lala::bobo';
        const { lastSelector } = parseSelector(tested);
        expect(lastSelector).to.equal('');
    });

    describe('Target chunk', () => {
        it('returns index of correct selector chunk', () => {
            const { selector, target } = parseSelector(
                '.first::second:someState::third',
                '.first::second:someState'.length
            );
            expect(target.index).to.equal(1);
            expect((target.focusChunk as any[]).length).to.equal(2);
            expect((target.focusChunk as any[])[1]).to.equal(selector[1]);
        });

        it('returns internal location in selector chunk', () => {
            const { target } = parseSelector(
                '.first::second:someState::third',
                '.first::second:someState'.length
            );
            expect(target.internalIndex).to.equal(1);
        });

        it('returns internal location in selector chunk II', () => {
            const { target } = parseSelector(
                '.first::second:someState::third:otherState',
                '.first::second:someState'.length
            );
            expect(target.internalIndex).to.equal(1);
        });
    });
});
