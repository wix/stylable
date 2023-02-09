import {
    parseForEditing,
    ERRORS,
    AMBIGUITY,
} from '@stylable/language-service/dist/lib-new/edit-time-parser';
import {
    assertRule,
    assertAtRule,
    assertDecl,
    assertInvalid,
    assertComment,
} from '../test-kit/postcss-node-asserts';
import { expect } from 'chai';
import { deindent } from '@stylable/core-test-kit';

function safeParse(source: string) {
    return parseForEditing(deindent(source));
}

describe('edit-time-parser', () => {
    it('should return valid full ast for valid input', () => {
        const { ast, errorNodes, ambiguousNodes } = safeParse(`
            .selector {
                decl: declValue;
            }
        `);

        const expected = deindent(`
            .selector {
                decl: declValue;
            }
        `);
        expect(ast.toString()).to.equal(expected.toString());
        expect(errorNodes.size, 'errors').to.eql(0);
        expect(ambiguousNodes.size, 'ambiguous').to.eql(0);
    });
    it('should assume un-opened rule at top level', () => {
        const { ast, errorNodes } = safeParse(`
            x:y
        `);

        expect(ast.toString(), 'stringify').to.equal('x:y');
        const invalid = assertInvalid(ast.nodes[0]);
        expect(invalid.assume, 'assume').to.eql(new Set(['rule']));
        expect(errorNodes.get(invalid), 'errors').to.eql([ERRORS.RULE_MISSING_OPEN]);
        expect(ast.source!.end!.offset, 'top end').to.eql(2);
    });
    it('should assume last-no-semicolon declaration as potential unopened rule', () => {
        /**
         * While the last declaration might be a valid one, we cannot distinguish
         * it from an intended beginning of a selector. So we output a declaration node,
         * But also keep track of it as a potential rule start, so that LSP can run heuristics
         * and decide if this is a declaration with no semicolon or un-opened rule later.
         */
        const { ast, errorNodes, ambiguousNodes } = safeParse(`
            .a {
                a:b;
                x:y
            }
            .b {
                x:
            }
        `);

        const expected = deindent(`
            .a {
                a:b;
                x:y
            }
            .b {
                x:
            }
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        {
            // check x:y
            const topRule = assertRule(ast.nodes[0]);
            const decl = assertDecl(topRule.nodes[0]);
            const noSemiColonDecl = assertDecl(topRule.nodes[1]);
            expect(decl.toString(), '(1) first decl').to.eql('a:b');
            expect(noSemiColonDecl.toString(), '(1) valid decl').to.eql('x:y');
            expect(errorNodes.get(noSemiColonDecl), '(1) errors').to.eql(undefined);
            expect(ambiguousNodes.get(noSemiColonDecl), '(1) ambiguous').to.eql([
                AMBIGUITY.POSSIBLE_UNOPENED_RULE,
            ]);
        }
        {
            // check x:
            const topRule = assertRule(ast.nodes[1]);
            const noSemiColonDecl = assertDecl(topRule.nodes[0]);
            expect(noSemiColonDecl.toString(), '(2) valid no value decl').to.eql('x:');
            expect(errorNodes.get(noSemiColonDecl), '(2) errors').to.eql(undefined);
            expect(ambiguousNodes.get(noSemiColonDecl), '(2) ambiguous').to.eql([
                AMBIGUITY.POSSIBLE_UNOPENED_RULE,
            ]);
        }
    });
    it('should assume last invalid as un-opened rule or declaration at nested level', () => {
        const { ast, errorNodes } = safeParse(`
            .a {
                a:b;
                xxx
            }
        `);

        const expected = deindent(`
            .a {
                a:b;
                xxx
            }
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        const topRule = assertRule(ast.nodes[0]);
        const decl = assertDecl(topRule.nodes[0]);
        const invalid = assertInvalid(topRule.nodes[1]);
        expect(decl.toString(), '(1) first decl').to.eql('a:b');
        expect(invalid.toString(), '(1) invalid node').to.eql('xxx\n');
        expect(invalid.assume, '(1) assume').to.eql(new Set(['rule', 'decl']));
        expect(errorNodes.get(invalid), '(1) errors').to.eql([
            ERRORS.RULE_MISSING_OPEN,
            ERRORS.DECL_MISSING_COLON,
        ]);
    });
    it('should assume un-opened rule (multiple lines)', () => {
        const { ast, errorNodes } = safeParse(`
            .aaa

            @at-rule-like

            .bbb
        `);

        const expected = deindent(`
            .aaa

            @at-rule-like

            .bbb
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        const invalid = assertInvalid(ast.nodes[0]);
        expect(invalid.assume, 'assume').to.eql(new Set(['rule']));
        expect(invalid.value, 'value').to.eql('.aaa\n\n@at-rule-like\n\n.bbb');
        expect(errorNodes.get(invalid), 'errors').to.eql([ERRORS.RULE_MISSING_OPEN]);
    });
    it('should assume un-closed rule', () => {
        const { ast, errorNodes } = safeParse(`
            .aaa {
                color: red;
        `);
        // ToDo: decide if stringify should preserve the missing "}"
        const expected = deindent(`
            .aaa {
                color: red;}
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        const rule = assertRule(ast.nodes[0]);
        expect(errorNodes.get(rule), 'errors').to.eql([ERRORS.MISSING_CLOSE]);
    });
    it('should handle unclosed brackets (invalid selector)', () => {
        const { ast, errorNodes } = safeParse(`
            :selector( {}
        `);

        expect(ast.toString(), 'stringify').to.equal(':selector( {}');
        const invalid = assertInvalid(ast.nodes[0]);
        expect(invalid.assume, 'assume').to.eql(new Set(['rule']));
        expect(invalid.value, 'value').to.eql(':selector( {}');
        expect(errorNodes.get(invalid), 'errors').to.eql([
            ERRORS.RULE_MISSING_OPEN,
            ERRORS.UNCLOSED_BRACKETS,
        ]);
    });
    it('should handle missing declaration prop', () => {
        const { ast, errorNodes } = safeParse(`
            .a {
                :x;
            }
        `);

        const expected = deindent(`
            .a {
                :x;
            }
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        const rule = assertRule(ast.nodes[0]);
        const decl = assertDecl(rule.nodes[0]);
        expect(decl).to.contain({
            prop: '',
            value: 'x',
        });
        expect(errorNodes.get(decl), 'errors').to.eql(undefined);
    });
    it('should handle invalid declaration', () => {
        const { ast, errorNodes } = safeParse(`
            .a {
                prop:xxx:val;
                "xxx" prop:val;
                prop xxx:val;
                :
            }
        `);

        const expected = deindent(`
            .a {
                prop:xxx:val;
                "xxx" prop:val;
                prop xxx:val;
                :
            }
        `);
        expect(ast.toString(), 'stringify').to.equal(expected);
        const rule = assertRule(ast.nodes[0]);
        // ToDo: expose error on node
        {
            const decl = assertDecl(rule.nodes[0]);
            expect(decl).to.contain({
                prop: 'prop',
                value: 'xxx:val',
            });

            expect(errorNodes.get(decl), 'errors').to.eql(undefined);
        }
        {
            const decl = assertDecl(rule.nodes[1]);
            expect(decl).to.contain({
                prop: 'prop',
                value: 'val',
            });
            expect(decl.raws.before).to.eql('\n    "xxx" ');
            expect(errorNodes.get(decl), 'errors').to.eql(undefined); // ToDo: error?
        }
        {
            const decl = assertDecl(rule.nodes[2]);
            expect(decl).to.contain({
                prop: 'prop',
                value: 'val',
            });
            expect(decl.raws.between).to.eql(' xxx:');
            expect(errorNodes.get(decl), 'errors').to.eql(undefined); // ToDo: error?
        }
        {
            const decl = assertDecl(rule.nodes[3]);
            expect(decl).to.contain({
                prop: '',
                value: '',
            });
            expect(decl.raws.between).to.eql(':');
            expect(errorNodes.get(decl), 'errors').to.eql(undefined); // ToDo: error?
        }
    });
    it('should handle unexpected close', () => {
        const { ast, errorNodes } = safeParse(`.a {}}`);

        expect(ast.toString(), 'stringify').to.equal('.a {}}');
        const rule = assertRule(ast.nodes[0]);
        expect(rule.toString()).to.eql('.a {}');
        expect(errorNodes.get(ast), 'errors').to.eql([ERRORS.UNEXPECTED_CLOSE]);
    });
    it('should handle unexpected close (multiple)', () => {
        const { ast, errorNodes } = safeParse(`.a {}}}}`);

        expect(ast.toString(), 'stringify').to.equal('.a {}}}}');
        const rule = assertRule(ast.nodes[0]);
        expect(rule.toString()).to.eql('.a {}');
        expect(errorNodes.get(ast), 'errors').to.eql([
            ERRORS.UNEXPECTED_CLOSE,
            ERRORS.UNEXPECTED_CLOSE,
            ERRORS.UNEXPECTED_CLOSE,
        ]);
    });
    it('should handle un-named at-rule', () => {
        const { ast, errorNodes } = safeParse(`
            @;
            @ abc;
        `);

        expect(ast.toString(), 'stringify').to.equal('@;\n@ abc;');
        const noName = assertAtRule(ast.nodes[0]);
        const noNameWithParams = assertAtRule(ast.nodes[1]);
        expect(noName, 'noName').to.include({
            name: '',
            params: '',
        });
        expect(errorNodes.get(noName), 'errors empty').to.eql([ERRORS.ATRULE_MISSING_NAME]);
        expect(noNameWithParams, 'noName with params').to.include({
            name: '',
            params: 'abc',
        });
        expect(errorNodes.get(noNameWithParams), 'errors with params').to.eql([
            ERRORS.ATRULE_MISSING_NAME,
        ]);
    });
    it('should handle unclosed at-rule', () => {
        const { ast, errorNodes } = safeParse(`
            @xxx abc {
        `);

        // ToDo: decide if stringify should preserve the missing "}"
        expect(ast.toString(), 'stringify').to.equal('@xxx abc {}');
        const unclosed = assertAtRule(ast.nodes[0]);
        expect(unclosed, 'node').to.include({
            name: 'xxx',
            params: 'abc',
        });
        expect(errorNodes.get(unclosed), 'errors').to.eql([ERRORS.MISSING_CLOSE]);
    });
    it('should keep track of end of source for unclosed nested nodes', () => {
        const { ast } = safeParse(`
            @xxx abc {
                .yyy {
                    zzz
        `);

        expect(ast.toString(), 'stringify').to.equal('@xxx abc {\n    .yyy {\n        zzz}}');
        const atrule = assertAtRule(ast.nodes[0]);
        const rule = assertRule(atrule.nodes[0]);
        const invalid = assertInvalid(rule.nodes[0]);
        expect(atrule.source!.end!, 'atrule').to.eql(ast.source!.end);
        expect(rule.source!.end!, 'rule').to.eql(ast.source!.end);
        expect(invalid.source!.end!, 'decl').to.eql(ast.source!.end);
    });
    it('should handle unclosed comment', () => {
        const { ast, errorNodes, ambiguousNodes } = safeParse(`
            /*c1
            .selector1 {}
            /*c2*/
            .selector2 {}
        `);

        const expected = deindent(`
            /*c1
            .selector1 {}
            /*c2*/
            .selector2 {}
        `);
        expect(ast.toString()).to.equal(expected.toString());
        const overflowComment = assertComment(ast.nodes[0]);
        const afterRule = assertRule(ast.nodes[1]);
        expect(overflowComment.text, 'comment').to.eql('c1\n.selector1 {}\n/*c2');
        expect(afterRule.selector, 'rule').to.eql('.selector2');
        expect(errorNodes.size, 'errors').to.eql(0);
        expect(ambiguousNodes.size, 'ambiguous').to.eql(0);
    });
    it('should handle unclosed string', () => {
        // Probably not a real case, but just checking
        const { ast, errorNodes, ambiguousNodes } = safeParse(`
            "string...
            .selector {}
        `);

        const expected = deindent(`
            "string...
            .selector {}
        `);
        expect(ast.toString()).to.equal(expected.toString());
        const weirdRule = assertRule(ast.nodes[0]);
        expect(weirdRule.selector, 'selector').to.eql('"string...\n.selector');
        expect(errorNodes.size, 'errors').to.eql(0);
        expect(ambiguousNodes.size, 'ambiguous').to.eql(0);
    });
});
