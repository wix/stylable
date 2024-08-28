import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { parseImportMessages } from '@stylable/core/dist/helpers/import';
import { diagnostics as cssTypeDiagnostics } from '@stylable/core/dist/features/css-type';
import { diagnosticBankReportToStrings } from '@stylable/core-test-kit';
import { expect } from 'chai';
import { dirname } from 'path';

const typeDiagnostics = diagnosticBankReportToStrings(cssTypeDiagnostics);
const parseImportDiagnostics = diagnosticBankReportToStrings(parseImportMessages);

const project = 'errors-integration';
const projectDir = dirname(
    require.resolve(`@stylable/experimental-loader/test/projects/${project}/webpack.config`),
);

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            throwOnBuildError: false,
            projectDir,
            launchOptions: {
                // headless: false,
            },
        },
        before,
        afterEach,
        after,
    );

    it('emit errors and warnings from loader', () => {
        const errors = projectRunner.getBuildErrorMessagesDeep();
        const warnings = projectRunner.getBuildWarningsMessagesDeep();
        expect(errors[0].message).to.include(parseImportDiagnostics.EMPTY_IMPORT_FROM());
        expect(warnings[0].message).to.include(typeDiagnostics.UNSCOPED_TYPE_SELECTOR('Unknown'));
    });
});
