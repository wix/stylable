// import { flatMatch, processSource } from '@stylable/core-test-kit';
import * as chai from 'chai';
import { getFormatterArgs } from '../src/stylable-value-parsers';

const valueParser = require('postcss-value-parser');

const expect = chai.expect;

function getFunctionNode(src: string) {
    return valueParser(src).nodes[0];
}

function test(
    desc: string,
    src: string,
    expected: string[],
    allowComments = false,
    expectedWarnings?: string[]
) {
    it(desc, () => {
        const warns: string[] = [];
        expect(
            getFormatterArgs(getFunctionNode(src), allowComments, msg => warns.push(msg))
        ).to.eql(expected);
        if (expectedWarnings) {
            expect(expectedWarnings).to.eql(warns);
        }
    });
}

describe('Value argument parsing (split by comma)', () => {
    describe('valid inputs', () => {
        test('should process comma separated arguments', 'func(a, b, c)', ['a', 'b', 'c']);
        test(
            'should process comma separated arguments with comments',
            'func(a /*with comment*/, b, c)',
            ['a', 'b', 'c']
        );
        test(
            'should process comma separated arguments with comments (output comments)',
            'func(a /*with comment*/, b, c)',
            ['a /*with comment*/', 'b', 'c'],
            true
        );

        test(
            'should process comma separated arguments with spaces in the first value',
            'func(a 1 2 3, b, c)',
            ['a 1 2 3', 'b', 'c']
        );
        test('should process a function with a single argument', 'func(a)', ['a']);

        // "/"" and ":" are considered to be a "div" (separators) by postcss-value-parser,
        // making sure we don't split on them
        test('should process a function with a "/" (slash)', 'func(a/b, c)', ['a/b', 'c']);
        test('should process a function with a ":" (colon)', 'func(a:b, c)', ['a:b', 'c']);

        test('should process a function with string argument', 'func("A")', ['A']);
        test('should process a function with string argument and extra value', 'func("A" 10px)', [
            'A 10px'
        ]);
    });

    describe('invalid inputs', () => {
        test('should process a function with only a comment after a comma', 'func(a, /* BLAH*/)', [
            'a'
        ]);
        test(
            'should process only comments in args',
            'func(/*with comment*/  /*with comment*/, b, c)',
            ['', 'b', 'c']
        );
        test('should process a function without any parameters', 'func()', []);
        test('should process a function with a empty argument', 'func(a,)', ['a']);
        test('should process a function with too many commas', 'func(a,,)', ['a']);
        test('should process a function with too many commas', 'func(a,,b)', ['a', '', 'b']);
        test(
            'should process a function with comments and empty arguments',
            'func(a,/**/ /**/,)',
            ['a'],
            false,
            [
                'func(a,/**/ /**/,): argument at index 1 is empty',
                'func(a,/**/ /**/,): argument at index 2 is empty'
            ]
        );
    });
});
