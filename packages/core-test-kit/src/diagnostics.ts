import { expect } from 'chai';
import deindent from 'deindent';
import type { Position } from 'postcss';
import { Diagnostics, DiagnosticType, StylableMeta, StylableResults } from '@stylable/core';
import { DiagnosticBase, safeParse, StylableProcessor } from '@stylable/core/dist/index-internal';
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

interface MatchState {
    matches: number;
    location: string;
    word: string;
    severity: string;
}
const createMatchDiagnosticState = (): MatchState => ({
    matches: 0,
    location: ``,
    word: ``,
    severity: ``,
});
const isSupportedSeverity = (val: string): val is DiagnosticType => !!val.match(/info|warn|error/);
export function matchDiagnostic(
    type: `analyze` | `transform`,
    meta: Pick<StylableMeta, `diagnostics` | `transformDiagnostics`>,
    expected: {
        label?: string;
        message: string;
        severity: string;
        location: Location;
    },
    errors: {
        diagnosticsNotFound: (type: string, message: string, label?: string) => string;
        unsupportedSeverity: (type: string, severity: string, label?: string) => string;
        locationMismatch: (type: string, message: string, label?: string) => string;
        wordMismatch: (
            type: string,
            expectedWord: string,
            message: string,
            label?: string
        ) => string;
        severityMismatch: (
            type: string,
            expectedSeverity: string,
            actualSeverity: string,
            message: string,
            label?: string
        ) => string;
        expectedNotFound: (type: string, message: string, label?: string) => string;
    }
): string {
    const diagnostics = type === `analyze` ? meta.diagnostics : meta.transformDiagnostics;
    if (!diagnostics) {
        return errors.diagnosticsNotFound(type, expected.message, expected.label);
    }
    const expectedSeverity =
        (expected.severity as any) === `warn` ? `warning` : expected.severity || ``;
    if (!isSupportedSeverity(expectedSeverity)) {
        return errors.unsupportedSeverity(type, expected.severity || ``, expected.label);
    }
    let closestMatchState = createMatchDiagnosticState();
    const foundPartialMatch = (newState: MatchState) => {
        if (newState.matches >= closestMatchState.matches) {
            closestMatchState = newState;
        }
    };
    for (const report of diagnostics.reports.values()) {
        const matchState = createMatchDiagnosticState();
        if (report.message !== expected.message) {
            foundPartialMatch(matchState);
            continue;
        }
        matchState.matches++;
        // if (!expected.skipLocationCheck) {
        // ToDo: test all range
        if (report.node.source!.start!.offset !== expected.location.start!.offset) {
            matchState.location = errors.locationMismatch(type, expected.message, expected.label);
            foundPartialMatch(matchState);
            continue;
        }
        matchState.matches++;
        // }
        if (expected.location.word) {
            if (report.word !== expected.location.word) {
                matchState.word = errors.wordMismatch(
                    type,
                    expected.location.word,
                    expected.message,
                    expected.label
                );
                foundPartialMatch(matchState);
                continue;
            }
            matchState.matches++;
        }
        if (expected.severity) {
            if (report.severity !== expectedSeverity) {
                matchState.location = errors.severityMismatch(
                    type,
                    expectedSeverity,
                    report.severity,
                    expected.message,
                    expected.label
                );
                foundPartialMatch(matchState);
                continue;
            }
            matchState.matches++;
        }
        // expected matched!
        return ``;
    }
    return (
        closestMatchState.location ||
        closestMatchState.word ||
        closestMatchState.severity ||
        errors.expectedNotFound(type, expected.message, expected.label)
    );
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
    const res = new StylableProcessor(new Diagnostics()).process(root);

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
            if (!expectedWarning.skipLocationCheck) {
                expect(report.node.source!.start, 'start').to.eql(source.start);
            }
            if (source.word !== null) {
                expect(report.word).to.equal(source.word);
            }

            if (expectedWarning.severity) {
                expect(
                    report.severity,
                    `diagnostics severity mismatch, expected "${expectedWarning.severity}" but received "${report.severity}"`
                ).to.equal(expectedWarning.severity);
            }
        });

        expect(res.diagnostics.reports.length, 'diagnostics reports match').to.equal(
            warnings.length
        );
    }
    return res;
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
                    expect(report.word).to.eql(locations[path].word);
                    matches++;
                }
                if (expectedWarning.severity) {
                    expect(
                        report.severity,
                        `${report.message}: severity mismatch, expected ${expectedWarning.severity} but received ${report.severity}`
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
                expect(report.word).to.eql(locations[path].word);
            }

            if (expectedWarning.severity) {
                expect(
                    report.severity,
                    `diagnostics severity mismatch, expected ${expectedWarning.severity} but received ${report.severity}`
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

export type DiagnosticsBank = Record<string, (...args: any[]) => DiagnosticBase>;

export type UnwrapDiagnosticMessage<T extends DiagnosticsBank> = {
    [K in keyof T]: (...args: Parameters<T[K]>) => string;
};

export function diagnosticBankReportToStrings<T extends DiagnosticsBank>(
    bank: T
): UnwrapDiagnosticMessage<T> {
    const cleaned = {} as UnwrapDiagnosticMessage<T>;

    for (const [diagName, diagFunc] of Object.entries(bank)) {
        cleaned[diagName as keyof T] = (...args) => {
            return diagFunc(...args).message;
        };
    }

    return cleaned;
}
