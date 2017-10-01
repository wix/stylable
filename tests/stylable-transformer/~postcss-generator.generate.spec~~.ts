import { fromCSS } from "../../src";
import { Generator } from '../../src/generator';
import { Resolver } from '../../src/resolver';
import { Stylesheet } from '../../src/stylesheet';
import { matchCSSMatchers } from "../matchers/match-css";
import * as chai from "chai";


const expect = chai.expect;

chai.use(matchCSSMatchers);


describe('ADD Warnings', function () {


    it('component/tag selector with first Capital letter is overridden with -st-extends', function () {

        const sheetA = fromCSS(``, "SheetA");
        const sheetB = fromCSS(``, "SheetB");

        const entrySheet = fromCSS(`
        :import("./relative/path/to/sheetA.stylable.css"){
            -st-default: SheetA;
        }  
        :import("./relative/path/to/sheetB.stylable.css"){
            -st-default: SheetB;
        }                 
        SheetB {
            -st-extends: SheetA;
        }
    `, "TheGreatNameSpace");

        const css = Generator.generate([entrySheet], new Generator({
            namespaceDivider: "__THE_DIVIDER__",
            resolver: new Resolver({
                "./relative/path/to/sheetA.stylable.css": sheetA,
                "./relative/path/to/sheetB.stylable.css": sheetB
            })
        }));

        const res = [
            '.TheGreatNameSpace__THE_DIVIDER__root .SheetA__THE_DIVIDER__root {}',
        ];

        css.forEach((chunk, index) => expect(chunk).to.matchCSS(res[index]));
        expect(css.length).to.equal(res.length);
    });


})
