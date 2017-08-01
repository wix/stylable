import { Import, containsSymbol } from '../src/import';
import { expect } from "chai";

describe('Import', function () {

    describe('containsSymbol', function () {

        it('should find default import', function () {
            const _import = new Import('./a', 'Name', {});
            expect(containsSymbol(_import, 'Name')).to.equal(true);
        })


        it('should find named import', function () {
            const _import = new Import('./a', 'Name', { "ImportedName": "LocalImport" });
            expect(containsSymbol(_import, 'ImportedName')).to.equal(true);
        })

    });

    describe('fromImportObject', function () {

        it('should return Import instance from import CSS definition', function () {
            const _import = Import.fromImportObject('./a', {
                '-st-default': 'DefaultName',
                '-st-named': 'NamedA, NamedB',
            });

            if (!_import) {
                throw new Error('expected import to have value');
            }
            expect(_import.from).to.equal('./a');
            expect(_import.defaultExport).to.equal('DefaultName');
            expect(containsSymbol(_import, 'NamedA'), 'NamedA').to.equal(true);
            expect(containsSymbol(_import, 'NamedB'), 'NamedB').to.equal(true);
        });

        it('should return Import instance from import CSS definition with "from" inside definition', function () {
            const _import = Import.fromImportObject('', {
                '-st-from': './a',
                '-st-default': 'DefaultName',
            });

            if (!_import) {
                throw new Error('expected import to have value');
            }
            expect(_import.from).to.equal('./a');
            expect(_import.defaultExport).to.equal('DefaultName');
        });

        it('should return null when "from" is not found', function () {
            const _import = Import.fromImportObject('', {
                '-st-default': 'DefaultName',
            });

            expect(_import).to.equal(null);
        });

    });

});

