import { expect } from 'chai';
import { parse } from 'postcss';
import { getAstNodeAt } from '@stylable/core/dist/helpers/ast';
import { deindent } from '@stylable/core-test-kit';

function setupWithCursor(source: string) {
    const deindented = deindent(source);

    const position = deindented.indexOf(`|`);
    return {
        position,
        ast: parse(deindented.split(`|`).join(``)),
    };
}

// ToDo: make added syntax zero space: semicolon at declaration end
describe('helpers/ast', () => {
    describe(`getAstNodeAt`, () => {
        it(`should find position in declaration property (start)`, () => {
            const { position, ast } = setupWithCursor(`
                .selector {
                    |decl: declValue;
                }
            `);

            const [node, offsetInNode] = getAstNodeAt(ast, position);

            expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0]);
            expect(offsetInNode, 'offset').to.equal(0);
        });
        it(`should find position in declaration value (end)`, () => {
            const { position, ast } = setupWithCursor(`
                .selector {
                    decl1: declValue|;decl2: otherValue;
                }
            `);

            const [node, offsetInNode] = getAstNodeAt(ast, position);
            // ToDo: change to return value ast node
            expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0]);
            expect(offsetInNode, 'offset').to.equal(16);
        });
        it(`should find position in declaration property (end)`, () => {
            const { position, ast } = setupWithCursor(`
                .selector {
                    decl|: declValue;
                }
            `);

            const [node, offsetInNode] = getAstNodeAt(ast, position);

            expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0]);
            expect(offsetInNode, 'offset').to.equal(4);
        });
        it(`should find position in rule body (start)`, () => {
            const { position, ast } = setupWithCursor(`
                .selector {|
                    decl: declValue;
                }
            `);

            const [node, offsetInNode] = getAstNodeAt(ast, position);

            expect(node, 'node').to.equal((ast as any).nodes[0]);
            expect(offsetInNode, 'offset').to.equal(11);
        });
        it(`should find position in rule body (before declaration)`, () => {
            const { position, ast } = setupWithCursor(`
                .selector {
                   | decl: declValue;
                }
            `);

            const [node, offsetInNode] = getAstNodeAt(ast, position);

            expect(node, 'node').to.equal((ast as any).nodes[0]);
            expect(offsetInNode, 'offset').to.equal(15);
        });
    });

    xdescribe(`parseForInspection (safe parse)`, () => {
        // describe(`selector`, () => {
        //     it.skip(`should close rule`, () => {
        //         const ast = parseForInspection(`
        //             .selector
        //         `);
        //         expect(ast.toString()).to.equal(
        //             fullParse(`
        //             .selector{}
        //         `).toString()
        //         );
        //     });
        //     it.skip(`should close final multiple rules`, () => {
        //         const ast = parseForInspection(`
        //             .selectorA
        //             .selectorB
        //         `);
        //         expect(ast.toString()).to.equal(
        //             fullParse(`
        //             .selectorA
        //             .selectorB{}
        //         `).toString()
        //         );
        //     });
        //     it.skip(`should close multiple unclosed selectors`, () => {
        //         const ast = parseForInspection(`
        //             .selectorA
        //             ,
        //             .selectorB
        //         `);
        //         expect(ast.toString()).to.equal(
        //             fullParse(`
        //             .selectorA
        //             ,
        //             .selectorB{}
        //         `).toString()
        //         );
        //     });
        //     it.skip(`should close opened at rule`, () => {
        //         const ast = parseForInspection(`
        //             @someatrule
        //         `);
        //         expect(ast.toString(), `fixed source`).to.equal(
        //             fullParse(`
        //             @someatrule
        //         `).toString()
        //         );
        //         expect(ast.nodes.length, `rules amount`).to.equal(1);
        //         expect(ast.nodes[0], `rules amount`).to.contain({
        //             type: `atrule`,
        //             name: `someatrule`,
        //         });
        //     });
        // });
        // describe(`declaration`, () => {
        //     it(`should find position in standalone prop (declOrRule)`, () => {
        //         const { position, ast } = setupWithCursor(`
        //             .selector {
        //                 decl|
        //             }
        //         `);
        //         const [node, offsetInNode] = getAstNodeAt(ast, position);
        //         expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0]);
        //         expect(offsetInNode, 'offset').to.equal(4);
        //     });
        //     it.skip(`should find position in empty value (unclosed)`, () => {
        //         // const { position, ast } = setupWithCursor(`
        //         //     .selector {
        //         //         decl:|
        //         //     }
        //         // `);
        //         // const [node, offsetInNode] = getAstNodeAt(ast, position);
        //         // expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0].valueAst);
        //         // expect(offsetInNode, 'offset').to.equal(0);
        //     });
        //     it(`should find property for empty property`, () => {
        //         const { position, ast } = setupWithCursor(`
        //             .selector {
        //                 |: value;
        //             }
        //         `);
        //         const [node, offsetInNode] = getAstNodeAt(ast, position);
        //         expect(node, 'node').to.equal((ast as any).nodes[0].nodes[0]);
        //         expect(offsetInNode, 'offset').to.equal(0);
        //     });
        // });
    });
});
