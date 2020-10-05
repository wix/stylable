import ts from 'typescript';
import {
    Command,
    CompletionItem,
    Diagnostic,
    Location,
    ParameterInformation,
    Position,
    Range,
    TextEdit,
} from 'vscode-css-languageservice';

export interface LSPTypeHelpers {
    // TODO: remove me?
    CompletionItem: typeof CompletionItem;
    TextEdit: typeof TextEdit;
    Location: typeof Location;
    Range: typeof Range;
    Position: typeof Position;
    Command: typeof Command;
    ParameterInformation: typeof ParameterInformation;
    Diagnostic: typeof Diagnostic;
}

export interface ExtendedTsLanguageService {
    setOpenedFiles: (files: string[]) => void;
    ts: ts.LanguageService;
}
