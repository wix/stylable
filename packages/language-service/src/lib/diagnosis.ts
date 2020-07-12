import { Diagnostic as StylableDiagnostic, process, safeParse, Stylable } from '@stylable/core';
import { Diagnostic, Range } from 'vscode-languageserver-types';
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
    const docPostCSSRoot = safeParse(content, { from: filePath });

    if (docPostCSSRoot.source) {
        const { input } = docPostCSSRoot.source;

        // postcss runs path.resolve, which messes up in-memory fs implementation on windows
        Object.defineProperty(input, 'from', { value: filePath });
        input.file = filePath;
    }

    const meta = process(docPostCSSRoot);

    stylable.fileProcessor.add(filePath, meta);

    try {
        stylable.transform(meta);
    } catch {
        /**/
    }

    const cleanDoc = cssService.createSanitizedDocument(meta.rawAst, filePath, version);

    return meta.diagnostics.reports
        .concat(meta.transformDiagnostics ? meta.transformDiagnostics.reports : [])
        .map(reportToDiagnostic)
        .concat(cssService.getDiagnostics(cleanDoc));

    // stylable diagnostic to protocol diagnostic
    function reportToDiagnostic(report: StylableDiagnostic) {
        const severity = report.type === 'error' ? 1 : 2;
        const range = createRange(report);
        return Diagnostic.create(range, report.message, severity, undefined, 'stylable');
    }
}

export function createRange(report: StylableDiagnostic) {
    const source = report.node.source;
    const start = { line: 0, character: 0 };
    const end = { line: 0, character: 0 };
    if (report.options.word && source) {
        const lines: string[] = (source.input as any).css.split('\n');
        const searchStart = source.start!.line - 1;
        const searchEnd = source.end!.line - 1;
        for (let i = searchStart; i <= searchEnd; ++i) {
            const wordIndex = lines[i].indexOf(report.options.word);
            if (~wordIndex) {
                start.line = i;
                start.character = wordIndex;
                end.line = i;
                end.character = wordIndex + report.options.word.length;
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
