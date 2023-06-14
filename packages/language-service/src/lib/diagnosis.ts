import type { Diagnostic as StylableDiagnostic, Stylable } from '@stylable/core';
import { Diagnostic, Range } from 'vscode-languageserver';
import type { CssService } from './css-service';

export function createDiagnosis(
    content: string,
    version: number,
    filePath: string,
    stylable: Stylable,
    cssService: CssService
): Diagnostic[] {
    if (!filePath.endsWith('.st.css')) {
        return [];
    }

    const meta = stylable.fileProcessor.processContent(content, filePath);

    try {
        stylable.transform(meta);
    } catch {
        /*TODO: report this failure to transform */
    }

    const cleanDoc = cssService.createSanitizedDocument(meta.sourceAst, filePath, version);

    return meta.diagnostics.reports
        .concat(meta.transformDiagnostics ? meta.transformDiagnostics.reports : [])
        .map(reportToDiagnostic)
        .concat(cssService.getDiagnostics(cleanDoc, meta));

    // stylable diagnostic to protocol diagnostic
    function reportToDiagnostic(report: StylableDiagnostic) {
        const severity = report.severity === 'error' ? 1 : 2;
        const range = createRange(report);

        // todo: incorporate diagnostics code in v5
        return Diagnostic.create(range, report.message, severity, undefined, 'stylable');
    }
}

export function createRange(report: StylableDiagnostic) {
    const source = report.node.source;
    const start = { line: 0, character: 0 };
    const end = { line: 0, character: 0 };
    if (report.word && source) {
        const lines: string[] = (source.input as any).css.split('\n');
        const searchStart = source.start!.line - 1;
        const searchEnd = source.end!.line - 1;
        for (let i = searchStart; i <= searchEnd; ++i) {
            const wordIndex = lines[i].indexOf(report.word);
            if (~wordIndex) {
                start.line = i;
                start.character = wordIndex;
                end.line = i;
                end.character = wordIndex + report.word.length;
                break;
            }
        }
    } else if (source) {
        start.line = source.start!.line - 1;
        start.character = source.start!.column - 1;
        end.line = source.end!.line - 1;
        end.character = source.end!.column;
    }
    return Range.create(start, end);
}
