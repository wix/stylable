import { expect } from 'chai';
import { createGenerator } from '../src/generator';
import { createMinimalFS } from '../src/memory-minimal-fs';

describe('generator fromCSS', () => {

    it('should contain locals mapping', () => {

        const gen = createGenerator();

        const { runtime, meta } = gen.fromCSS(`
            .root {
                color: red;
            }
        `);

        expect(runtime.root).to.equal(gen.scope('root', meta.namespace));

    });

    it('should contain $stylesheet', () => {

        const gen = createGenerator();

        const { runtime } = gen.fromCSS(`
            .root {
                color: red;
            }
        `);

        expect(runtime.$stylesheet.root).to.equal('root');

    });

});

describe('generator fromFile', () => {

    it('should contain locals mapping', () => {

        const { fs, requireModule } = createMinimalFS({
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        });

        const gen = createGenerator(fs, requireModule);

        const { runtime, meta } = gen.fromFile('/style.st.css');

        expect(runtime.root).to.equal(gen.scope('root', meta.namespace));

    });

    it('should contain $stylesheet', () => {

        const { fs, requireModule } = createMinimalFS({
            files: {
                '/style.st.css': {
                    content: ''
                }
            }
        });

        const gen = createGenerator(fs, requireModule);

        const { runtime } = gen.fromFile('/style.st.css');

        expect(runtime.$stylesheet.root).to.equal('root');

    });

});
