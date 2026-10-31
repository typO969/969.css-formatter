import * as vscode from "vscode";
import { format } from "./cssFormatter";

export function activate(context: vscode.ExtensionContext) {
    // 1. Full Document Formatting Provider
    const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider("css", {
        provideDocumentFormattingEdits(
            document: vscode.TextDocument,
            options: vscode.FormattingOptions,
            token: vscode.CancellationToken
        ): vscode.TextEdit[] {
            const config = vscode.workspace.getConfiguration("editor", document.uri);
            return format(document, undefined, options, config);
        }
    });

    // 2. Range Formatting Provider (supports "Format Selection" / Ctrl+K Ctrl+F)
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider("css", {
        provideDocumentRangeFormattingEdits(
            document: vscode.TextDocument,
            range: vscode.Range,
            options: vscode.FormattingOptions,
            token: vscode.CancellationToken
        ): vscode.TextEdit[] {
            const config = vscode.workspace.getConfiguration("editor", document.uri);
            return format(document, range, options, config);
        }
    });

    // 3. Command registration in case invoked by command palette or keybinding
    const commandDisposable = vscode.commands.registerCommand("extension.formatCSS", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== "css") {
            return;
        }
        await vscode.commands.executeCommand("editor.action.formatDocument");
    });

    context.subscriptions.push(documentFormattingProvider, rangeFormattingProvider, commandDisposable);
}

export function deactivate() {}