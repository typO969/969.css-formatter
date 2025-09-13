import * as vscode from 'vscode';
import { css as css_beautify, JSBeautifyOptions } from 'js-beautify';

export function format(
    document: vscode.TextDocument,
    range: vscode.Range | undefined,
    options: vscode.WorkspaceConfiguration
): vscode.TextEdit[] {
    let value = document.getText();
    let includesEnd = true;
    let tabSize = options.get<number>("tabSize", 4);

    if (range) {
        let startOffset = document.offsetAt(range.start);
        let endOffset = document.offsetAt(range.end);
        value = value.substring(startOffset, endOffset);
    } else {
        range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
    }

    // Ensure blank lines before comments (fixes comments sticking to previous rule)
    value = value.replace(/([^\n])\n\/\*/g, '$1\n\n/*');

    // Apply formatting options
    const cssOptions: JSBeautifyOptions = {
        indent_size: tabSize,
        indent_char: options.get<boolean>("insertSpaces", true) ? ' ' : '\t',
        end_with_newline: includesEnd && options.get<boolean>("insertFinalNewline", false),
        selector_separator_newline: options.get<boolean>("newlineBetweenSelectors", true),
        newline_between_rules: options.get<boolean>("newlineBetweenRules", true),
        space_around_selector_separator: options.get<boolean>("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Keep single-property rules on one line
        indent_empty_lines: options.get<boolean>("indentEmptyLines", false),
        max_preserve_newlines: 2, // Preserve up to 2 blank lines
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: options.get<number>("wrapLineLength", 0),
        eol: '\n'
    };

    let result = css_beautify(value, cssOptions);

    return [{
        range: range,
        newText: result
    }];
}
