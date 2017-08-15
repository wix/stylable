import { expect } from "chai";
import { generateStylableExports } from "../utils/generate-test-util";

describe('Exports', function () {

    it('contain root exports', function () {

        const cssExports = generateStylableExports({
            entry: '/entry.st.css',
            files: {
                "/entry.st.css": {
                    namespace: 'entry',
                    content: ``
                }
            }
        });


        expect(cssExports).to.eql({
            root: 'entry--root'
        });


    });


});
