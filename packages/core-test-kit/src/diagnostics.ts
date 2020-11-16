import { expect } from 'chai';
import deindent from 'deindent';
import { Position } from 'postcss';
import { Diagnostics, process, safeParse, StylableMeta, StylableResults } from '@stylable/core';
import { Config, generateFromMock } from './generate-test-util';

export interface Diagnostic {
    severity?: 'warning' | 'error';
    message: string;
    file: string;
    skipLocationCheck?: boolean;
    skip?: boolean;
}

export function findTestLocations(css: string) {
    let line = 1;
    let column = 1;
    let inWord = false;
    let start: Position | undefined = undefined;
    let end: Position | undefined = undefined;
    let word: string | null = null;
    for (let i = 0; i < css.length; i++) {
        const ch = css.charAt(i);
        if (ch === '\n') {
            line += 1;
            column = 1;
        } else if (ch === '|') {
            if (!start) {
                start = { line, column, offset: i };
            } else {
                end = { line, column, offset: i };
            }
        } else if (ch === '$') {
            inWord = !inWord;
            if (inWord) {
                word = '';
            }
        } else if (inWord) {
            word += ch;
        } else {
            column++;
        }
    }
    return { start, end, word, css: css.replace(/[|$]/gm, '') };
}

export function expectWarnings(css: string, warnings: Diagnostic[]) {
    const source = findTestLocations(css);
    const root = safeParse(source.css);
    const res = process(root);

    res.diagnostics.reports.forEach((report, i) => {
        const expectedWarning = warnings[i];
        if (!expectedWarning) {
            return;
        }
        if (expectedWarning.skip) {
            return;
        }

        expect(report.message).to.equal(expectedWarning.message);
        expect(report.node.source!.start, 'start').to.eql(source.start);
        if (source.word !== null) {
            expect(report.options.word).to.equal(source.word);
        }

        if (expectedWarning.severity) {
            expect(
                report.type,
                `diagnostics severity mismatch, expected "${expectedWarning.severity}" but received "${report.type}"`
            ).to.equal(expectedWarning.severity);
        }
    });

    expect(res.diagnostics.reports.length, 'diagnostics reports match').to.equal(warnings.length);
}

export function expectWarningsFromTransform(
    config: Config,
    expectedWarnings: Diagnostic[]
): StylableResults {
    config.trimWS = false;

    const locations: Record<
        string,
        {
            start?: Position;
            end?: Position;
            word: string | null;
            css: string;
        }
    > = {};
    for (const path in config.files) {
        const source = findTestLocations(deindent(config.files[path].content).trim());
        config.files[path].content = source.css;
        locations[path] = source;
    }
    const diagnostics = new Diagnostics();
    const result = generateFromMock(config, diagnostics);
    const warningMessages = diagnostics.reports.map((d) => d.message);

    if (expectedWarnings.length === 0 && diagnostics.reports.length !== 0) {
        expect(
            expectedWarnings.length,
            `expected no diagnostics but received ${JSON.stringify(warningMessages, null, 2)}`
        ).to.equal(diagnostics.reports.length);
    }

    for (const [i, report] of diagnostics.reports.entries()) {
        const expectedWarning = expectedWarnings[i];
        if (!expectedWarning) {
            continue;
        }
        const path = expectedWarning.file;

        expect(report.message).to.equal(expectedWarning.message);

        if (!expectedWarning.skipLocationCheck) {
            expect(report.node.source!.start).to.eql(locations[path].start);
        }

        if (locations[path].word !== null) {
            expect(report.options.word).to.eql(locations[path].word);
        }

        if (expectedWarning.severity) {
            expect(
                report.type,
                `diagnostics severity mismatch, expected ${expectedWarning.severity} but received ${report.type}`
            ).to.equal(expectedWarning.severity);
        }
    }

    expect(
        expectedWarnings.length,
        `expected diagnostics: ${JSON.stringify(
            expectedWarnings.map((d) => d.message),
            null,
            2
        )}, but received ${JSON.stringify(warningMessages, null, 2)}`
    ).to.equal(diagnostics.reports.length);

    return result;
}

export function shouldReportNoDiagnostics(meta: StylableMeta, checkTransformDiagnostics = true) {
    const processReports = meta.diagnostics.reports;

    expect(
        processReports.length,
        `processing diagnostics: ${processReports.map((r) => r.message)}`
    ).to.equal(0);
    if (meta.transformDiagnostics && checkTransformDiagnostics) {
        const transformerReports = meta.transformDiagnostics.reports;

        expect(
            transformerReports.length,
            `transforming diagnostics: ${transformerReports.map((r) => r.message)}`
        ).to.equal(0);
    }
}
