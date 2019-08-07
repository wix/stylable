import {
    CompletionParams,
    createConnection,
    IConnection,
    InitializeResult
} from 'vscode-languageserver';
import {
    ColorInformation,
    ColorPresentation,
    ColorPresentationParams,
    ColorPresentationRequest,
    CompletionItem,
    CompletionList,
    CompletionRequest,
    DefinitionRequest,
    DidChangeConfigurationNotification,
    DidChangeConfigurationParams,
    DidChangeTextDocumentNotification,
    DidChangeTextDocumentParams,
    DidChangeWatchedFilesNotification,
    DidChangeWatchedFilesParams,
    DidCloseTextDocumentNotification,
    DidCloseTextDocumentParams,
    DidOpenTextDocumentNotification,
    DidOpenTextDocumentParams,
    DidSaveTextDocumentNotification,
    DidSaveTextDocumentParams,
    DocumentColorParams,
    DocumentColorRequest,
    ExitNotification,
    Hover,
    HoverRequest,
    InitializeParams,
    InitializeRequest,
    Location,
    LogMessageNotification,
    LogMessageParams,
    NotificationHandler,
    PublishDiagnosticsNotification,
    PublishDiagnosticsParams,
    ReferenceParams,
    ReferencesRequest,
    RenameParams,
    RenameRequest,
    ShowMessageNotification,
    ShowMessageParams,
    ShutdownRequest,
    SignatureHelp,
    SignatureHelpRequest,
    TelemetryEventNotification,
    TextDocumentPositionParams,
    WorkspaceEdit
} from 'vscode-languageserver-protocol';
// adapted from https://github.com/Microsoft/vscode-languageserver-node/blob/master/client/src/client.ts
export class StreamConnectionClient {
    public sendRequest: IConnection['sendRequest'];
    private readonly connection: IConnection;

    constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
        this.connection = createConnection(input, output);
        this.sendRequest = this.connection.sendRequest.bind(this.connection) as any;
    }

    public listen(): void {
        this.connection.listen();
    }

    // extend
    public async initialize(params: InitializeParams = {} as any): Promise<InitializeResult> {
        if (!params.capabilities) {
            params.capabilities = {};
        }
        return await this.connection.sendRequest(InitializeRequest.type, params);
    }

    public async shutdown() {
        return await this.connection.sendRequest(ShutdownRequest.type, undefined);
    }

    public exit() {
        return this.connection.sendNotification(ExitNotification.type);
    }

    public onLogMessage(handler: NotificationHandler<LogMessageParams>) {
        return this.connection.onNotification(LogMessageNotification.type, handler);
    }

    public onShowMessage(handler: NotificationHandler<ShowMessageParams>) {
        return this.connection.onNotification(ShowMessageNotification.type, handler);
    }

    public onTelemetry(handler: NotificationHandler<any>) {
        return this.connection.onNotification(TelemetryEventNotification.type, handler);
    }

    public didChangeConfiguration(params: DidChangeConfigurationParams) {
        return this.connection.sendNotification(DidChangeConfigurationNotification.type, params);
    }

    public didChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
        return this.connection.sendNotification(DidChangeWatchedFilesNotification.type, params);
    }

    public didOpenTextDocument(params: DidOpenTextDocumentParams) {
        return this.connection.sendNotification(DidOpenTextDocumentNotification.type, params);
    }

    public didChangeTextDocument(params: DidChangeTextDocumentParams) {
        return this.connection.sendNotification(DidChangeTextDocumentNotification.type, params);
    }

    public didCloseTextDocument(params: DidCloseTextDocumentParams) {
        return this.connection.sendNotification(DidCloseTextDocumentNotification.type, params);
    }

    public didSaveTextDocument(params: DidSaveTextDocumentParams) {
        return this.connection.sendNotification(DidSaveTextDocumentNotification.type, params);
    }

    public onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
        return this.connection.onNotification(PublishDiagnosticsNotification.type, handler);
    }

    public async completion(
        params: CompletionParams
    ): Promise<CompletionList | CompletionItem[] | null> {
        return await this.connection.sendRequest(CompletionRequest.type, params);
    }

    public async hover(params: TextDocumentPositionParams): Promise<Hover | null> {
        return await this.connection.sendRequest(HoverRequest.type, params);
    }

    public async signatureHelp(params: TextDocumentPositionParams): Promise<SignatureHelp | null> {
        return await this.connection.sendRequest(SignatureHelpRequest.type, params);
    }

    public async definition(params: TextDocumentPositionParams) {
        return await this.connection.sendRequest(DefinitionRequest.type, params);
    }

    public async references(params: ReferenceParams): Promise<Location[] | null> {
        return await this.connection.sendRequest(ReferencesRequest.type, params);
    }

    public async rename(params: RenameParams): Promise<WorkspaceEdit | null> {
        return await this.connection.sendRequest(RenameRequest.type, params);
    }

    public async documentColor(params: DocumentColorParams): Promise<ColorInformation[]> {
        return await this.connection.sendRequest(DocumentColorRequest.type, params);
    }

    public async colorPresentation(params: ColorPresentationParams): Promise<ColorPresentation[]> {
        return await this.connection.sendRequest(ColorPresentationRequest.type, params);
    }
}
