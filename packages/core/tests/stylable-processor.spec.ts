import * as chai from 'chai';
import { resolve } from '../src/path';
import { ImportSymbol, processNamespace, processorWarnings } from '../src/stylable-processor';
import { flatMatch } from './matchers/flat-match';
import { processSource } from './utils/generate-test-util';

const expect = chai.expect;
chai.use(flatMatch);

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
            message: processorWarnings.INVALID_NAMESPACE_DEF()
        });
    });

    it('warn on empty-ish namespace', () => {

        const { diagnostics } = processSource(
            `@namespace '   ';`,
            { from: '/path/to/source' }
        );

        expect(diagnostics.reports[0]).to.include({
            type: 'error',
            message: processorWarnings.EMPTY_NAMESPACE_DEF()
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

    it('resolve namespace hook', () => {
        const from = resolve('/path/to/style.css');
        const result = processSource(`
            @namespace "name";
        `, { from }, s => 'Test-' + s);

        expect(result.namespace).to.equal('Test-name');

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
        // ToDo: check if test is needed
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
});
