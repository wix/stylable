import * as postcss from "postcss";
import { postcssStylable } from "../src/postcss-plugin";
import { readFileSync } from "fs";




const processor = postcss(postcssStylable());


describe('PostCSS Stylable Plugin', function () {


    it('', function () {
        processor.process(readFileSync('./fixtures/entry/entry.st.css'));
    });


})