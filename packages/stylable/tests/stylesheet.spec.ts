import { Stylesheet, InMemoryContext } from "../src/stylesheet";
import { expect } from "chai";

describe('Stylesheet', function () {

    describe('generate', function () {

        let ctx: InMemoryContext;

        beforeEach(() => {
            ctx = new InMemoryContext();
        });

        it('generate empty', function () {
            const stylesheet = new Stylesheet({});
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([]);

        });

        it('generate with single rule', function () {
            const cssDefinition = {
                ".container": { color: "black" }
            };
            const stylesheet = new Stylesheet({ cssDefinition });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([".container {\n    color: black\n}"]);

        });

        it('generate with multiple rules', function () {
            const cssDefinition = {
                ".container": { color: "black", background: "white" }
            };
            const stylesheet = new Stylesheet({ cssDefinition });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([".container {\n    color: black;\n    background: white\n}"]);
        });

        it('generate with multiple selectors', function () {
            const cssDefinition = {
                ".container": { color: "black" },
                ".wrapper": { background: "white" }
            };
            const stylesheet = new Stylesheet({ cssDefinition });
            stylesheet.generate(ctx);
            expect(ctx.buffer).to.eql([
                ".container {\n    color: black\n}",
                ".wrapper {\n    background: white\n}"
            ]);
        });

    });

});

