import * as postcss from 'postcss';
import { cachedProcessFile } from '../src/cached-process-file';
import { process, StylableMeta, processNamespace } from '../src/stylable-processor';

import { flatMatch } from "./matchers/falt-match";
import * as chai from "chai";


const expect = chai.expect;
chai.use(flatMatch);



export var loadFile: any = cachedProcessFile<StylableMeta>((path, content) => {
    return processSource(content, { from: path })
},
    {
        readFileSync() {
            return '';
        },
        statSync() {
            return { mtime: new Date };
        }
    }
)


function processSource(source: string, options: postcss.ProcessOptions = {}) {
    return process(postcss.parse(source, options));
}

describe('@custom-selector', function () {


    it('collect custom-selectors', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @custom-selector :--icon .root > .icon;
        `, { from });

        
        expect(result.customSelectors[":--icon"]).to.equal('.root > .icon');

    });

    
    it('expand custom-selector before process (reflect on ast)', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @custom-selector :--icon .root > .icon;
            :--icon, .class {
                color: red;
            }
        `, { from });
        
        const r = <postcss.Rule>result.ast.nodes![0];
        expect(r.selector).to.equal('.root > .icon, .class');
        expect(result.classes['icon']).to.contain({"_kind":"class","name":"icon"})

    });


});

