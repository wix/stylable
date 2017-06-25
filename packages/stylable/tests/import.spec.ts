import { Import } from '../src/import';
import { expect } from "chai";

describe('Import', function () {

    describe('containsSymbol', function () {

        it('should find default import', function () {
            const _import = new Import('./a', 'Name', {});
            expect(_import.containsSymbol('Name')).to.equal(true);
        })


        it('should find named import', function () {
            const _import = new Import('./a', 'Name', { "ImportedName": "LocalImport" });
            expect(_import.containsSymbol('ImportedName')).to.equal(true);
        })

    });

});

