import * as vscode from 'vscode';
import { css as css_beautify, CSSBeautifyOptions, JSBeautifyOptions } from 'js-beautify';

type CssBeautifyOptions = CSSBeautifyOptions & {
    brace_style?: JSBeautifyOptions['brace_style'] | 'collapse,preserve-inline';
};

/**
 * Combines multi-line comma-separated selector lists into a clean single line
 * while preserving leading comments and indentation.
 */
function cleanSelectorPart(selectorPart: string): string {
    let commentPrefix = '';
    let rem = selectorPart;

    const commentMatch = rem.match(/^([\s\S]*?\*\/)([ \t]*\r?\n[ \t]*)/);
    if (commentMatch) {
        commentPrefix = commentMatch[1] + commentMatch[2];
        rem = rem.slice(commentMatch[0].length);
    } else {
        const leadingMatch = rem.match(/^(\r?\n[ \t]*)/);
        if (leadingMatch) {
            commentPrefix = leadingMatch[1];
            rem = rem.slice(leadingMatch[0].length);
        }
    }

    const indentMatch = rem.match(/^([ \t]*)/);
    const indent = indentMatch ? indentMatch[1] : '';

    const lines = rem.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
        return selectorPart.replace(/[ \t]+$/, '');
    }

    const joined = lines.join(' ').replace(/\s*,\s*/g, ', ');
    return (commentPrefix ? commentPrefix : '') + indent + joined;
}

/**
 * Intelligent CSS Formatter Post-Processor
 * - Combines comma-separated selector lists across multiple lines into a single line
 * - Collapses single-declaration blocks into one line
 * - Preserves multi-declaration blocks formatted across multiple lines
 * - Handles quotes, data URIs, and at-rules
 */
function collapseSingleDeclarationsSafe(css: string): string {
    let result = '';
    let i = 0;
    const len = css.length;

    while (i < len) {
        const openBrace = css.indexOf('{', i);
        if (openBrace === -1) {
            result += css.slice(i);
            break;
        }

        let depth = 1;
        let j = openBrace + 1;
        let inString: string | null = null;
        let inComment = false;
        let hasNestedBlock = false;

        while (j < len && depth > 0) {
            const ch = css[j];
            const next = css[j + 1];

            if (inComment) {
                if (ch === '*' && next === '/') {
                    inComment = false;
                    j += 2;
                    continue;
                }
            } else if (inString) {
                if (ch === '\\') {
                    j += 2;
                    continue;
                } else if (ch === inString) {
                    inString = null;
                }
            } else {
                if (ch === '/' && next === '*') {
                    inComment = true;
                    j += 2;
                    continue;
                } else if (ch === '"' || ch === "'") {
                    inString = ch;
                } else if (ch === '{') {
                    depth++;
                    hasNestedBlock = true;
                } else if (ch === '}') {
                    depth--;
                    if (depth === 0) break;
                }
            }
            j++;
        }

        if (depth !== 0) {
            result += css.slice(i);
            break;
        }

        const closeBrace = j;
        const rawSelector = css.slice(i, openBrace);
        const body = css.slice(openBrace + 1, closeBrace);

        if (hasNestedBlock) {
            const cleanedSel = cleanSelectorPart(rawSelector);
            result += cleanedSel + ' {' + collapseSingleDeclarationsSafe(body) + '}';
            i = closeBrace + 1;
            continue;
        }

        const trimmedSelector = rawSelector.trim();
        const isContainerAtRule = /^@(media|supports|layer|keyframes|document|container)\b/i.test(trimmedSelector);

        let declCount = 0;
        let inBodyComment = false;
        let inBodyString: string | null = null;
        let hasColon = false;
        let nonCommentText = '';

        for (let k = 0; k < body.length; k++) {
            const ch = body[k];
            const next = body[k + 1];

            if (inBodyComment) {
                if (ch === '*' && next === '/') {
                    inBodyComment = false;
                    k++;
                }
            } else if (inBodyString) {
                if (ch === '\\') {
                    k++;
                } else if (ch === inBodyString) {
                    inBodyString = null;
                }
            } else {
                if (ch === '/' && next === '*') {
                    inBodyComment = true;
                    k++;
                } else if (ch === '"' || ch === "'") {
                    inBodyString = ch;
                } else if (ch === ':') {
                    hasColon = true;
                    nonCommentText += ch;
                } else if (ch === ';') {
                    declCount++;
                    nonCommentText = '';
                    hasColon = false;
                } else if (!/\s/.test(ch)) {
                    nonCommentText += ch;
                }
            }
        }

        if (hasColon && nonCommentText.length > 0) {
            declCount++;
        }

        // Clean & combine the selector list onto a single line
        const cleanedSel = cleanSelectorPart(rawSelector);

        if (declCount === 1 && !isContainerAtRule) {
            const cleanedBody = body
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .join(' ');

            result += cleanedSel + ' { ' + cleanedBody + ' }';
        } else {
            result += cleanedSel + ' {' + body + '}';
        }

        i = closeBrace + 1;
    }

    return result;
}

/**
 * Clamps consecutive blank lines to the allowed maximum.
 */
function clampBlankLines(css: string, maxBlankLines = 2): string {
    if (maxBlankLines < 1) return css;
    const maxNewlines = maxBlankLines + 1;
    const pattern = new RegExp(`(\\n[ \\t]*){${maxNewlines + 1},}`, 'g');
    const replacement = '\n'.repeat(maxNewlines);
    return css.replace(pattern, replacement);
}

export function format(
    document: vscode.TextDocument,
    range: vscode.Range | undefined,
    formattingOptions: vscode.FormattingOptions | undefined,
    editorConfig: vscode.WorkspaceConfiguration
): vscode.TextEdit[] {
    let value = document.getText();
    let includesEnd = true;

    // Use document-specific formatting options when available, falling back to workspace config
    let tabSize = formattingOptions?.tabSize ?? editorConfig.get<number>("tabSize", 4);
    let insertSpaces = formattingOptions?.insertSpaces ?? editorConfig.get<boolean>("insertSpaces", true);

    if (range) {
        let startOffset = document.offsetAt(range.start);
        let endOffset = document.offsetAt(range.end);
        value = value.substring(startOffset, endOffset);
    } else {
        range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
    }

    // Precision comment spacing: Only add blank lines before comments when preceded by a closing rule brace '}'
    value = value.replace(/\}[ \t]*\r?\n(?!\r?\n)[ \t]*\/\*/g, '}\n\n/*');

    // Apply formatting options (keeping archived configuration options intact)
    const cssOptions: CssBeautifyOptions = {
        indent_size: tabSize,
        indent_char: insertSpaces ? ' ' : '\t',
        end_with_newline: includesEnd && editorConfig.get<boolean>("insertFinalNewline", false),
        selector_separator_newline: false,
        //selector_separator_newline: editorConfig.get<boolean>("newlineBetweenSelectors", true),
        //newline_between_rules: editorConfig.get<boolean>("newlineBetweenRules", true),
        space_around_selector_separator: true,
        //space_around_selector_separator: editorConfig.get<boolean>("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Collapse blocks but keep inline rules intact
        indent_empty_lines: editorConfig.get<boolean>("indentEmptyLines", false),
        max_preserve_newlines: 10, // Allow js-beautify to retain blank lines for our custom clamp
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: editorConfig.get<number>("wrapLineLength", 0),
        eol: '\n'
    };

    let result = css_beautify(value, cssOptions);

    // Post-processing: Combine selectors, collapse single declaration blocks, and clamp blank lines
    result = collapseSingleDeclarationsSafe(result);
    const maxBlankLines = editorConfig.get<number>("maxPreserveNewlines", 2);
    result = clampBlankLines(result, maxBlankLines);

    // If result is identical to original, return empty array to prevent dirtying the document buffer
    if (result === value) {
        return [];
    }

    return [{
        range: range,
        newText: result
    }];
}