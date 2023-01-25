import { TextDocument } from 'vscode-css-languageservice';
import { Diagnostics, Stylable, StylableMeta } from '@stylable/core';
import type { StylableFile } from '../lib/service';
import { getAstNodeAt } from './ast-from-position';
import { parseForEditing, ParseReport } from './edit-time-parser';
import { StylableProcessor } from '@stylable/core/dist/index-internal';
import { URI } from 'vscode-uri';

export class LangServiceContext {
    public meta: StylableMeta;
    public errorNodes: Map<any, ParseReport[]>;
    public ambiguousNodes: Map<any, ParseReport[]>;
    public location: ReturnType<typeof getAstNodeAt>;
    public document: TextDocument;
    constructor(public stylable: Stylable, private fileData: StylableFile, private offset: number) {
        const parseResult = parseForEditing(fileData.content, {
            from: fileData.path,
        });
        this.errorNodes = parseResult.errorNodes;
        this.ambiguousNodes = parseResult.ambiguousNodes;
        this.location = getAstNodeAt(parseResult, offset);
        this.meta = new StylableProcessor(
            new Diagnostics(),
            this.stylable.resolveNamespace
        ).process(parseResult.ast);
        this.document = TextDocument.create(
            URI.file(this.meta.source).toString(),
            'stylable',
            this.fileData.stat.mtime.getTime(),
            this.fileData.content
        );
    }
    public getPosition(offset: number = this.offset) {
        return this.document.positionAt(offset);
    }
}
