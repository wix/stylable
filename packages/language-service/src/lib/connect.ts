import { IConnection } from 'vscode-languageserver';
import { StylableLanguageService } from './service';

export function connectLSP(stylableLSP: StylableLanguageService, connection: IConnection) {
    const docsDispatcher = stylableLSP.getDocsDispatcher();
    docsDispatcher.listen(connection);
    docsDispatcher.onDidChangeContent(stylableLSP.diagnose(connection));
    docsDispatcher.onDidClose(stylableLSP.clearDiagnostics(connection));

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
