import { expect } from "chai";
import { process, StyleableMeta, processNamespace } from '../src/postcss-process';
import { cachedProcessFile } from '../src/cached-process-file';
import * as postcss from 'postcss';


export var loadFile: any = cachedProcessFile<StyleableMeta>((path, content) => {
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

describe('Stylable postcss process', function () {

    it('report if missing filename', function () {
        var { diagnostics, namespace } = processSource(``);
        expect(namespace).to.equal('s0');
        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'missing source filename'
        })
    });

    it('report on invalid namespace', function () {

        const { diagnostics } = processSource(
            `@namespace App;`,
            { from: '/path/to/source' }
        );

        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'invalid namespace'
        })
    });

    it('collect namespace', function () {
        const from = "/path/to/style.css";
        const result = processSource(`
            @namespace "name";
            @namespace 'anther-name';
        `, { from });

        expect(result.namespace).to.equal(processNamespace('anther-name', from));

    });

    it('use filename as default namespace prefix', function () {
        const from = "/path/to/style.css";

        const result = processSource(`
            
        `, { from });

        expect(result.namespace).to.eql(processNamespace('style', from));

    });

    it('collect :import', function () {

        const result = processSource(`
            :import {
                -st-from: "./some/path";
            }
            :import {
                -st-from: "./some/other/path";
                -st-named: a,b as c;
            }
            :import {
                -st-from: "./some/global/path";
                -st-default: name;
            }
        `, { from: "path/to/style.css" });

        expect(result.imports[0].from).to.eql("./some/path");
        expect(result.imports[0].rule.selector).to.eql(':import');

        expect(result.imports[1].rule.selector).to.eql(':import');
        expect(result.imports[1].from).to.eql("./some/other/path");
        expect(result.imports[1].named).to.eql({a: 'a', c: 'b'});
   
        expect(result.imports[2].rule.selector).to.eql(':import');
        expect(result.imports[2].from).to.eql("./some/global/path");
        expect(result.imports[2].named).to.eql({});
        expect(result.imports[2].defaultExport).to.eql('name');
   
    });


    it('collect :import warnings', function () {

        const result = processSource(`
            :import {}
            :import {
                color: red;
            }
        `, { from: "path/to/style.css" });

        expect(result.diagnostics.reports[0].message).to.eql('"-st-from" is missing in :import block');
        expect(result.diagnostics.reports[1].message).to.eql('"color" css attribute cannot be used inside :import block');

    });


    it('collect :vars', function () {

        const result = processSource(`
            :vars {
                name: value;
            }
            :vars {
                name: value;
            }
        `, { from: "path/to/style.css" });

        expect(result.vars.length).to.eql(2);

    });

    it('resolve local :vars', function () {

        const result = processSource(`
            :vars {
                name: value;
                myname: value(name);
            }
        `, { from: "path/to/style.css" });

        expect(result.mappedVars).to.eql({
            name: 'value',
            myname: 'value'
        });

    });


    it('collect classes', function () {

        const result = processSource(`
            .classA{}
            .classB, .classC{}
            :not(.classD){}
            .classE:hover{}
        `, { from: "path/to/style.css" });

        expect(result.classes.length).to.eql(5);

    });

    it('collect classes in @media', function () {

        const result = processSource(`
            @media (max-width: 300px) {
                .classA{}
                .classB, .classC{}
                :not(.classD){}
                .classE:hover{}
            }
        `, { from: "path/to/style.css" });

        expect(result.classes.length).to.eql(5);

    });


    it('collect @keyframes', function () {

        const result = processSource(`
            @keyframes name {
                from{}
                to{}
            }
            @keyframes anther-name {
                from{}
                to{}
            }
        `, { from: "path/to/style.css" });

        expect(result.keyframes.length).to.eql(2);

    });


    it('collect -st-nodes', function () {

        const result = processSource(`
            .classA{
                -st-thing: value;
            }
            .classA .classB{
                -st-other-thing: value;
            }
        `, { from: "path/to/style.css" });

        expect(result.directives['-st-thing'].length).to.eql(1);
        expect(result.directives['-st-other-thing'].length).to.eql(1);

    });

});

