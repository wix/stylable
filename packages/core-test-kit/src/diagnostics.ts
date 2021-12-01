import { expect } from 'chai';
import deindent from 'deindent';
import type { Position } from 'postcss';
import {
    Diagnostics,
    DiagnosticType,
    process,
    safeParse,
    StylableMeta,
    StylableResults,
} from '@stylable/core';
import { Config, generateStylableResult } from './generate-test-util';

export interface Diagnostic {
    severity?: DiagnosticType;
    message: string;
    file: string;
    skipLocationCheck?: boolean;
    skip?: boolean;
}

export interface Location {
    start?: Position;
    end?: Position;
    word: string | null;
    css: string;
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

export function expectAnalyzeDiagnostics(
    css: string,
    warnings: Diagnostic[],
    { partial = false }: { partial?: boolean } = {}
) {
    const source = findTestLocations(css);
    const root = safeParse(source.css);
    const res = process(root);

    if (partial) {
        if (warnings.length === 0) {
            expect(res.diagnostics.reports.length, 'no diagnostics expected').to.equal(0);
        }
        matchPartialDiagnostics(warnings, res.diagnostics, {
            '/entry.st.css': source,
        });
    } else {
        res.diagnostics.reports.forEach((report, i) => {
            const expectedWarning = warnings[i];
            if (!expectedWarning || expectedWarning.skip) {
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

        expect(res.diagnostics.reports.length, 'diagnostics reports match').to.equal(
            warnings.length
        );
    }
}

function matchPartialDiagnostics(
    expectedList: Diagnostic[],
    diagnostics: Diagnostics,
    locations: Record<string, Location>
) {
    // ToDo: adding diagnostics numbered ids would really help
    for (const expectedWarning of expectedList) {
        const path = expectedWarning.file;
        let closest: Error | null = null;
        let closestMatches = 0;
        for (const report of diagnostics.reports.values()) {
            let matches = 0;
            try {
                expect(report.message).to.equal(expectedWarning.message);
                matches++;
                if (!expectedWarning.skipLocationCheck) {
                    expect(report.node.source!.start).to.eql(locations[path].start);
                    matches++;
                }
                if (locations[path].word !== null) {
                    expect(report.options.word).to.eql(locations[path].word);
                    matches++;
                }
                if (expectedWarning.severity) {
                    expect(
                        report.type,
                        `${report.message}: severity mismatch, expected ${expectedWarning.severity} but received ${report.type}`
                    ).to.equal(expectedWarning.severity);
                    matches++;
                }
            } catch (e) {
                if (matches >= closestMatches) {
                    closest = e as Error;
                    closestMatches = matches;
                }
                continue;
            }
            // expected matched!
            closest = null;
            break;
        }
        if (closest) {
            throw closest;
        }
    }
}

export function expectTransformDiagnostics(
    config: Config,
    expectedWarnings: Diagnostic[],
    { partial = false }: { partial?: boolean } = {}
): StylableResults {
    config.trimWS = false;

    const locations: Record<string, Location> = {};
    for (const path in config.files) {
        const source = findTestLocations(deindent(config.files[path].content).trim());
        config.files[path].content = source.css;
        locations[path] = source;
    }
    const diagnostics = new Diagnostics();
    const result = generateStylableResult(config, diagnostics);
    const warningMessages = diagnostics.reports.map((d) => d.message);

    if (expectedWarnings.length === 0 && diagnostics.reports.length !== 0) {
        expect(
            expectedWarnings.length,
            `expected no diagnostics but received ${JSON.stringify(warningMessages, null, 2)}`
        ).to.equal(diagnostics.reports.length);
    }

    if (partial) {
        matchPartialDiagnostics(expectedWarnings, diagnostics, locations);
    } else {
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
    }

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
