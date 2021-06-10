export function reportDiagnostics(diagnosticsMessages: Map<string, string[]>) {
    console.log('[Stylable Diagnostics]');
    for (const [filePath, messages] of diagnosticsMessages.entries()) {
        console.log(`[${filePath}]\n`, messages.join('\n\n'));
    }
}
