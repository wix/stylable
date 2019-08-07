import {
    createConnection,
    DidChangeConfigurationNotification,
    IConnection,
    IPCMessageReader,
    IPCMessageWriter,
    TextDocuments
} from 'vscode-languageserver';

import fs from '@file-services/node';

import { initializeResult } from '../capabilities';

import { StylableLanguageService } from './service';

const connection: IConnection = createConnection(
    new IPCMessageReader(process),
    new IPCMessageWriter(process)
);

connection.listen();
connection.onInitialize(params => {
    const rootPath = params.rootPath || '';

    const stylableLSP = new StylableLanguageService({
        fs,
        rootPath,
        requireModule: require,
        textDocuments: new TextDocuments()
    });

    connect(stylableLSP);

    return initializeResult;
});

connection.onInitialized(() => {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

export function connect(stylableLSP: StylableLanguageService, conn?: IConnection) {
    conn = conn || connection;

    const docsDispatcher = stylableLSP.getDocsDispatcher();
    docsDispatcher.listen(connection);
    docsDispatcher.onDidChangeContent(stylableLSP.diagnose(connection));

    connection.onCompletion(stylableLSP.onCompletion.bind(stylableLSP));
    connection.onDefinition(stylableLSP.onDefinition.bind(stylableLSP));
    connection.onHover(stylableLSP.onHover.bind(stylableLSP));
    connection.onReferences(stylableLSP.onReferences.bind(stylableLSP));
    connection.onDocumentColor(stylableLSP.onDocumentColor.bind(stylableLSP));
    connection.onColorPresentation(stylableLSP.onColorPresentation.bind(stylableLSP));
    connection.onRenameRequest(stylableLSP.onRenameRequest.bind(stylableLSP));
    connection.onSignatureHelp(stylableLSP.onSignatureHelp.bind(stylableLSP));
    connection.onDocumentFormatting(stylableLSP.onDocumentFormatting.bind(stylableLSP));
    connection.onDidChangeConfiguration(stylableLSP.diagnose(connection));
}
