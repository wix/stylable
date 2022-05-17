import { CSSCustomProperty } from '@stylable/core/dist/features';
import { expect } from 'chai';
import {
    populateDirectorySync,
    loadDirSync,
    runCliCodeMod,
    createTempDirectory,
    ITempDirectory,
} from '@stylable/e2e-test-kit';
import { diagnosticBankReportToStrings } from '@stylable/core-test-kit';

const cssCustomPropertyDiagnostics = diagnosticBankReportToStrings(CSSCustomProperty.diagnostics);

describe('CLI Codemods st-global-custom-property-to-at-property', () => {
    let tempDir: ITempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory();
    });
    afterEach(async () => {
        await tempDir.remove();
    });

    it('should handle one param', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@st-global-custom-property --myVar;`,
        });

        runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-global-custom-property-to-at-property',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal('@property st-global(--myVar);');
    });

    it('should handle multiple params', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@st-global-custom-property --myVar, --mySecondVar, --myThirdVar;`,
        });

        runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-global-custom-property-to-at-property',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(dirContent['style.st.css']).equal(
            '@property st-global(--myVar);\n@property st-global(--mySecondVar);\n@property st-global(--myThirdVar);'
        );
    });

    it('should handle invalid global-custom-property structure', () => {
        populateDirectorySync(tempDir.path, {
            'package.json': `{"name": "test", "version": "0.0.0"}`,
            'style.st.css': `@st-global-custom-property --myVar --mySecondVar;`,
        });

        const { stdout } = runCliCodeMod([
            '--rootDir',
            tempDir.path,
            '--mods',
            'st-global-custom-property-to-at-property',
        ]);

        const dirContent = loadDirSync(tempDir.path);

        expect(stdout).to.match(
            new RegExp(
                `style.st.css: ${cssCustomPropertyDiagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(
                    '--myVar --mySecondVar'
                )}`
            )
        );
        expect(dirContent['style.st.css']).equal(
            '@st-global-custom-property --myVar --mySecondVar;'
        );
    });
});
