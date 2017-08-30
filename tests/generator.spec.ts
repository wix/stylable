import { expect } from "chai";
import { createGenerator } from "../src/generator";
import { createMinimalFS } from "../src/memory-minimal-fs";


describe('generator fromCSS', function () {

    it('should contain locals mapping', function () {

        const gen = createGenerator();

        const { runtime, meta } = gen.fromCSS(`
            .root {
                color: red;
            }
        `);

        expect(runtime.root).to.equal(gen.scope('root', meta.namespace));

    });

    it('should contain $stylesheet', function () {

        const gen = createGenerator();

        const { runtime } = gen.fromCSS(`
            .root {
                color: red;
            }
        `);

        expect(runtime.$stylesheet.root).to.equal('root');

    });

});

describe('generator fromFile', function () {

    it('should contain locals mapping', function () {

        const { fs, requireModule } = createMinimalFS({
            files: {
                "/style.st.css": {
                    content: ''
                }
            }
        })

        const gen = createGenerator(fs, requireModule);

        const { runtime, meta } = gen.fromFile('/style.st.css');

        expect(runtime.root).to.equal(gen.scope('root', meta.namespace));

    });

    it('should contain $stylesheet', function () {


        const { fs, requireModule } = createMinimalFS({
            files: {
                "/style.st.css": {
                    content: ''
                }
            }
        })

        const gen = createGenerator(fs, requireModule);

        const { runtime } = gen.fromFile('/style.st.css');


        expect(runtime.$stylesheet.root).to.equal('root');

    });

});

