import { InitializeResult, TextDocumentSyncKind } from 'vscode-languageserver-protocol';

export const initializeResult: InitializeResult = {
    capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        completionProvider: {
            triggerCharacters: ['.', '-', ':', '"', ',']
        },
        definitionProvider: true,
        hoverProvider: true,
        referencesProvider: true,
        renameProvider: true,
        colorProvider: true,
        signatureHelpProvider: {
            triggerCharacters: ['(', ',']
        }
    }
};
