import * as postcss from 'postcss';
import { cachedProcessFile } from '../src/cached-process-file';
import { ImportSymbol, process, processNamespace, StylableMeta } from '../src/stylable-processor';

import * as chai from 'chai';
import { resolve } from 'path';
import { flatMatch } from './matchers/falt-match';

const expect = chai.expect;
chai.use(flatMatch);

export let loadFile: any = cachedProcessFile<StylableMeta>((path, content) => {
    return processSource(content, { from: path });
},
    {
        readFileSync() {
            return '';
        },
        statSync() {
            return { mtime: new Date() };
        }
    }
);

function processSource(source: string, options: postcss.ProcessOptions = {}) {
    return process(postcss.parse(source, options));
}

describe('Stylable postcss process', () => {

    it('report if missing filename', () => {
        const { diagnostics, namespace } = processSource(``);
        expect(namespace).to.equal('s0');
        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'missing source filename'
        });
    });

    it('report on invalid namespace', () => {

        const { diagnostics } = processSource(
            `@namespace App;`,
            { from: '/path/to/source' }
        );

        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: 'invalid namespace'
        });
    });

    it('collect namespace', () => {
        const from = resolve('/path/to/style.css');
        const result = processSource(`
            @namespace "name";
            @namespace 'anther-name';
        `, { from });

        expect(result.namespace).to.equal(processNamespace('anther-name', from));

    });

    it('use filename as default namespace prefix', () => {
        const from = resolve('/path/to/style.css');

        const result = processSource(`

        `, { from });

        expect(result.namespace).to.eql(processNamespace('style', from));

    });

    it('collect :import', () => {

        const result = processSource(`
            :import {
                -st-from: "./some/path";
            }
            :import {
                -st-from: "./some/other/path";
                -st-named: a,b as c;
            }
            :import {
                -st-from: "../some/global/path";
                -st-default: name;
            }
        `, { from: 'path/to/style.css' });

        expect(result.imports.length).to.eql(3);

        expect(result.mappedSymbols.a).to.include({
            _kind: 'import',
            type: 'named'
        });

        expect(result.mappedSymbols.c).to.include({
            _kind: 'import',
            type: 'named'
        });

        expect(result.mappedSymbols.name).to.include({
            _kind: 'import',
            type: 'default'
        });

        expect((result.mappedSymbols.a as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });

        expect((result.mappedSymbols.c as ImportSymbol).import).to.deep.include({
            // from: '/path/to/some/other/path',
            fromRelative: './some/other/path',
            defaultExport: '',
            named: { a: 'a', c: 'b' }
        });

        expect((result.mappedSymbols.name as ImportSymbol).import).to.deep.include({
            // from: '/path/some/global/path',
            fromRelative: '../some/global/path',
            defaultExport: 'name',
            named: {}
        });

    });

    xit('collect :import warnings', () => {

        const result = processSource(`
            :import {}
            :import {
                color: red;
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports[0].message).to.eql('"-st-from" is missing in :import block');
        expect(result.diagnostics.reports[1].message)
            .to.eql('"color" css attribute cannot be used inside :import block');

    });

    it('collect :import overrides', () => {

        const result = processSource(`
            :import {
                color: red;
                color2: blue;
            }
        `, { from: 'path/to/style.css' });

        expect(result.imports[0].overrides[0].toString()).to.equal('color: red');
        expect(result.imports[0].overrides[1].toString()).to.equal('color2: blue');

    });

    it('collect :vars', () => {

        const result = processSource(`
            :vars {
                name: value;
            }
            :vars {
                name: value;
                name1: value1;
            }
        `, { from: 'path/to/style.css' });

        expect(result.vars.length).to.eql(3);

    });

    it('collect :vars types', () => {

        const result = processSource(`
            :vars {
                /*@type VALUE_INLINE*/name: inline;
                /*@type VALUE_LINE_BEFORE*/
                name1: line before;
            }
        `, { from: 'path/to/style.css' });

        expect(result.vars[0].valueType).to.eql('VALUE_INLINE');
        expect(result.vars[1].valueType).to.eql('VALUE_LINE_BEFORE');

    });

    it('resolve local :vars (dont warn if name is imported)', () => {

        const result = processSource(`
            :import {
                -st-from: "./file.css";
                -st-named: name;
            }
            :vars {
                myname: value(name);
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);

    });

    it('collect typed classes extends', () => {

        const result = processSource(`
            :import {
                -st-from: './file.css';
                -st-default: Style;
            }
            .myclass {
                -st-extends: Style;
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);

        expect(result.classes).to.flatMatch({
            myclass: {

                '-st-extends': {
                    _kind: 'import',
                    type: 'default',
                    import: {
                        // from: '/path/to/file.css',
                        fromRelative: './file.css',
                        defaultExport: 'Style'
                    }
                }
            }
        });

    });

    it('collect typed classes compose', () => {

        const result = processSource(`
            :import {
                -st-from: './file.css';
                -st-default: Style;
            }
            .class {}
            .my-class {
                -st-compose: Style, class;
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);

        expect(result.classes).to.flatMatch({
            'my-class': {
                '-st-compose': [
                    {
                        _kind: 'import',
                        type: 'default',
                        import: {
                            // from: '/path/to/file.css',
                            fromRelative: './file.css',
                            defaultExport: 'Style'
                        }
                    },
                    {
                        _kind: 'class',
                        name: 'class'
                    }
                ]
            }
        });

    });

    it('collect typed classes with auto states', () => {

        const result = processSource(`
            .root {
                -st-states: state1, state2;
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            root: {
                '-st-states': {
                    state1: null,
                    state2: null
                }
            }
        });

    });

    it('collect typed classes with mapping states', () => {

        const result = processSource(`
            .root {
                -st-states: state1, state2("[data-mapped]");
            }
        `, { from: 'path/to/style.css' });

        expect(result.diagnostics.reports.length, 'no reports').to.eql(0);
        expect(result.classes).to.flatMatch({
            root: {
                '-st-states': {
                    state1: null,
                    state2: '[data-mapped]'
                }
            }
        });

    });

    it('collect typed elements', () => {

        const result = processSource(`
            Element {

            }
            div {

            }
        `, { from: 'path/to/style.css' });

        expect(Object.keys(result.elements).length).to.eql(1);

    });

    it('always contain root class', () => {

        const result = processSource(`

        `, { from: 'path/to/style.css' });

        expect(result.classes).to.eql({
            root: {
                '_kind': 'class',
                'name': 'root',
                '-st-root': true
            }
        });

    });

    it('collect classes', () => {

        const result = processSource(`
            .root{}
            .classA{}
            .classB, .classC, .classA{}
            :not(.classD){}
            .classE:hover{}
        `, { from: 'path/to/style.css' });

        expect(Object.keys(result.classes).length).to.eql(6);

    });

    it('collect classes in @media', () => {

        const result = processSource(`
            @media (max-width: 300px) {
                .root{}
                .classA{}
                .classB, .classC{}
                :not(.classD){}
                .classE:hover{}
            }
        `, { from: 'path/to/style.css' });

        expect(Object.keys(result.classes).length).to.eql(6);

    });

    it('collect @keyframes', () => {

        const result = processSource(`
            @keyframes name {
                from{}
                to{}
            }
            @keyframes anther-name {
                from{}
                to{}
            }
        `, { from: 'path/to/style.css' });

        expect(result.keyframes.length).to.eql(2);

    });

    it('should annotate import with -st-theme', () => {

        const result = processSource(`
            :import {
                -st-theme: true;
                -st-from: "./theme.st.css";
            }
        `);

        const importSymbol = result.imports[0];

        expect(importSymbol.theme).to.eql(true);

    });

});
