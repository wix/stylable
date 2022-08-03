import { expect } from 'chai';
import {
    CSSClass,
    CSSCustomProperty,
    CSSKeyframes,
    CSSType,
    STNamespace,
    STGlobal,
    STImport,
    STMixin,
    STSymbol,
    STVar,
    STCustomSelector,
} from '@stylable/core/dist/features';
import { generalDiagnostics } from '@stylable/core/dist/features/diagnostics';
import { atPropertyValidationWarnings } from '@stylable/core/dist/helpers/css-custom-property';
import { parseImportMessages, ensureImportsMessages } from '@stylable/core/dist/helpers/import';
import { mixinHelperDiagnostics } from '@stylable/core/dist/helpers/mixin';
import { valueDiagnostics } from '@stylable/core/dist/helpers/value';
import { functionDiagnostics } from '@stylable/core/dist/functions';
import { stateDiagnostics } from '@stylable/core/dist/pseudo-states';
import { processorDiagnostics } from '@stylable/core/dist/stylable-processor';
import { transformerDiagnostics } from '@stylable/core/dist/stylable-transformer';
import { utilDiagnostics, sourcePathDiagnostics } from '@stylable/core/dist/stylable-utils';

describe('diagnostics error codes', () => {
    it('should assure all error codes are unique', () => {
        const diags: Record<string, any> = {};

        const reporters = {
            ...generalDiagnostics,
            ...CSSClass.diagnostics,
            ...CSSCustomProperty.diagnostics,
            ...CSSKeyframes.diagnostics,
            ...CSSType.diagnostics,
            ...STNamespace.diagnostics,
            ...STGlobal.diagnostics,
            ...STImport.diagnostics,
            ...STMixin.diagnostics,
            ...STSymbol.diagnostics,
            ...STVar.diagnostics,
            ...STCustomSelector.diagnostics,
            ...atPropertyValidationWarnings,
            ...parseImportMessages,
            ...ensureImportsMessages,
            ...mixinHelperDiagnostics,
            ...valueDiagnostics,
            ...functionDiagnostics,
            ...stateDiagnostics,
            ...processorDiagnostics,
            ...transformerDiagnostics,
            ...utilDiagnostics,
            ...sourcePathDiagnostics,
        };

        let failingCode = '';

        for (const [_name, func] of Object.entries(reporters)) {
            const code = func.code;

            if (diags[code] && diags[code] !== func) {
                failingCode = code;
            } else {
                diags[code] = func;
            }
        }

        expect(failingCode, 'duplicate error code detected').to.eql('');
    });
});
