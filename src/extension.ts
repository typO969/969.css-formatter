import * as vscode from "vscode";
import { format } from "./cssFormatter";

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.languages.registerDocumentFormattingEditProvider("css", {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            return format(document, undefined, vscode.workspace.getConfiguration("editor"));
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
