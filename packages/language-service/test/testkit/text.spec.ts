import { Position, Range } from 'vscode-languageserver-protocol';
import { expect } from './chai.spec';

export function offsetToLspPos(offset: number, content: string): Position {
    const lines = content.substr(0, offset).split('\n');
    return {
        line: lines.length - 1,
        character: lines[lines.length - 1].length
    };
}

export function getRangeAndText(caretedText: string): { range: Range; text: string } {
    const splut = caretedText.split('|');
    if (splut.length !== 3) {
        throw new Error('getRangeAndText supports text with two carets');
    }
    const text = splut.join('');
    const start = offsetToLspPos(splut[0].length, text);
    const end = offsetToLspPos(splut[0].length + splut[1].length, text);
    return {
        text,
        range: { start, end }
    };
}

describe('text test tools', () => {
    describe('offsetToLspPos', () => {
        const linesArr = ['', '0123456789', '01234'];
        const linesJoined = linesArr.join('\n');

        function totalLinesOffset(i: number) {
            // for each line count its length and +1 for the '\n' character
            return linesArr.slice(0, i).reduce((acc, curr) => acc + curr.length + 1, 0);
        }

        for (let i = 0; i < linesArr.length; i++) {
            it(`line: ${i}, char: 0`, () => {
                expect(offsetToLspPos(totalLinesOffset(i), linesJoined), 'tsToLspPos').to.eql({
                    line: i,
                    character: 0
                });
            });
            if (linesArr[i].length) {
                it(`line: ${i}, char: 1`, () => {
                    expect(
                        offsetToLspPos(totalLinesOffset(i) + 1, linesJoined),
                        'tsToLspPos'
                    ).to.eql({
                        line: i,
                        character: 1
                    });
                });
                if (linesArr[i].length > 1) {
                    it(`line: ${i}, char: ${linesArr[i].length}`, () => {
                        expect(
                            offsetToLspPos(totalLinesOffset(i + 1) - 1, linesJoined),
                            'tsToLspPos'
                        ).to.eql({
                            line: i,
                            character: linesArr[i].length
                        });
                    });
                }
            }
        }
    });
    describe('getRangeAndText', () => {
        it('on empty text', () => {
            expect(getRangeAndText('||')).to.eql({
                text: '',
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
            });
        });
        it('on zero pipes', () => {
            expect(() => getRangeAndText('sdfujsad')).to.throw(Error);
        });
        it('on one pipe', () => {
            expect(() => getRangeAndText('sdfu|jsad')).to.throw(Error);
        });
        it('on three pipe', () => {
            expect(() => getRangeAndText('sdfu|js|a|d')).to.throw(Error);
        });
        it('on range padded with characters on a single line', () => {
            expect(getRangeAndText('0123|4567|89')).to.eql({
                text: '0123456789',
                range: {
                    start: {
                        line: 0,
                        character: 4
                    },
                    end: {
                        line: 0,
                        character: 8
                    }
                }
            });
        });
    });
});
