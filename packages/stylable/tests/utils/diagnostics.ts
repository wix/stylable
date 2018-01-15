import { expect } from 'chai';
import { Diagnostics, safeParse } from '../../src/index';
import { process } from '../../src/stylable-processor';
import { Config, generateFromMock } from './generate-test-util';
const deindent = require('deindent');

export interface Warning {
    message: string;
    file: string;
    skipLocationCheck?: boolean;
}

export function findTestLocations(css: string) {
    let line = 1;
    let column = 1;
    let inWord = false;
    let start;
    let end;
    let word = null;
    for (let i = 0; i < css.length; i++) {
        const ch = css.charAt(i);
        if (ch === '\n') {
            line += 1;
            column = 1;
        } else if (ch === '|') {
            if (!start) {
                start = { line, column };
            } else {
                end = { line, column };
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

export function expectWarnings(css: string, warnings: Warning[]) {
    const source = findTestLocations(css);
    const root = safeParse(source.css);
    const res = process(root);

    res.diagnostics.reports.forEach((report, i) => {
        expect(report.message).to.equal(warnings[i].message);
        expect(report.node.source.start, 'start').to.eql(source.start);
        if (source.word !== null) {
            expect(report.options.word).to.eql(source.word);
        }
    });

    expect(res.diagnostics.reports.length, 'diagnostics reports match').to.equal(warnings.length);
}

export function expectWarningsFromTransform(config: Config, warnings: Warning[]) {
    config.trimWS = false;

    const locations: any = {};
    for (const path in config.files) {
        const source = findTestLocations(deindent(config.files[path].content).trim());
        config.files[path].content = source.css;
        locations[path] = source;
    }
    const diagnostics = new Diagnostics();
    generateFromMock(config, diagnostics);
    if (warnings.length === 0 && diagnostics.reports.length !== 0) {
        expect(warnings.length, 'diagnostics reports match').to.equal(diagnostics.reports.length);
    }
    diagnostics.reports.forEach((report, i) => {
        const path = warnings[i].file;
        expect(report.message).to.equal(warnings[i].message);
        if (!warnings[i].skipLocationCheck) {
            expect(report.node.source.start).to.eql(locations[path].start);
        }
        if (locations[path].word !== null) {
            expect(report.options.word).to.eql(locations[path].word);
        }
    });
    expect(warnings.length, 'diagnostics reports match').to.equal(diagnostics.reports.length);
}
