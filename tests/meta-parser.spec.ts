import { createMeta, generateMetaFromCSS } from '../src/meta-parser';
import { expect } from "chai";


describe('meta-parser.generateMetaFromCSS', function () {

    it('with empty css', function () {
        const meta = generateMetaFromCSS(``);
        expect(meta).to.eql(createMeta())
    });

    it('with typed class -sb-root true', function () {
        const meta = generateMetaFromCSS(`
            .container {
                -sb-root: true;
            }
        `);
        
        expect(meta.typedClasses).to.eql({
            container: {
                SbRoot: true
            }
        })
    });

    it('with typed class -sb-root ANY_VALUE that is not "false"', function () {
        const meta = generateMetaFromCSS(`
            .container {
                -sb-root: ANY_VALUE;
            }
        `);
        
        expect(meta.typedClasses).to.eql({
            container: {
                SbRoot: true
            }
        })
    });

    
    it('with typed class -sb-root is false', function () {
        const meta = generateMetaFromCSS(`
            .container {
                -sb-root: false;
            }
        `);
        
        expect(meta.typedClasses).to.eql({
            container: {
                SbRoot: false
            }
        })
    });
})
