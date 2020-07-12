import type ts from 'typescript';
import type {
    Command,
    CompletionItem,
    Diagnostic,
    Location,
    NotificationType,
    ParameterInformation,
    Position,
    Range,
    TextEdit,
} from 'vscode-languageserver';
import type {
    ColorPresentationRequest,
    DocumentColorRequest,
} from 'vscode-languageserver-protocol';

export interface NotificationTypes {
    // TODO: remove me?
    openDoc: NotificationType<string, void>;
    colorRequest: typeof DocumentColorRequest;
    colorPresentationRequest: typeof ColorPresentationRequest;
}

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
