import * as vscode from 'vscode';
import { css as css_beautify, JSBeautifyOptions } from 'js-beautify';

type CssBeautifyOptions = Omit<JSBeautifyOptions, 'brace_style'> & {
    brace_style?: JSBeautifyOptions['brace_style'] | 'collapse,preserve-inline';
    newline_between_rules?: boolean;
};

type InlineCommentCounts = Map<string, number>;

function collapseSingleDeclarationBlocks(css: string): string {
    const lines = css.split('\n');
    const output: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openBraceIndex = line.indexOf('{');

        if (openBraceIndex !== -1 && !line.trim().startsWith('@')) {
            const bodyLines: string[] = [];
            let closingLineIndex = -1;
            let nestedBlockDetected = false;

            for (let j = i + 1; j < lines.length; j++) {
                const currentLine = lines[j];

                if (currentLine.indexOf('{') !== -1) {
                    nestedBlockDetected = true;
                    break;
                }

                if (currentLine.indexOf('}') !== -1) {
                    closingLineIndex = j;
                    break;
                }

                bodyLines.push(currentLine);
            }

            if (!nestedBlockDetected && closingLineIndex !== -1) {
                const bodyWithoutComments = bodyLines
                    .map(l => l.replace(/\/\*[\s\S]*?\*\//g, '').trim())
                    .filter(Boolean)
                    .join(' ');

                const declarationCount = bodyWithoutComments
                    .split(';')
                    .map(part => part.trim())
                    .filter(part => part.length > 0).length;

                if (declarationCount === 1) {
                    const propertyText = bodyLines
                        .map(l => l.trim())
                        .filter(l => l.length > 0)
                        .join(' ');

                    if (propertyText.length > 0) {
                        const collapsedLine = line.replace(/\{\s*$/, '{ ') + propertyText + ' }';
                        output.push(collapsedLine);
                        i = closingLineIndex;
                        continue;
                    }
                }
            }
        }

        output.push(line);
    }

    return output.join('\n');
}

function keepInlineCommentsOnSameLine(css: string, inlineCommentCounts: InlineCommentCounts): string {
    const shouldInline = (comment: string): boolean => {
        const key = comment.trim();
        const current = inlineCommentCounts.get(key);

        if (current && current > 0) {
            inlineCommentCounts.set(key, current - 1);
            return true;
        }

        return false;
    };

    let result = css.replace(/;[ \t]*\n[ \t]*(\/\*[^\n]*\*\/)/g, (match, comment) =>
        shouldInline(comment) ? `; ${comment}` : match
    );

    result = result.replace(
        /}[ \t]*\n(?:[ \t]*\n)?[ \t]*(\/\*[^\n]*\*\/)/g,
        (match, comment) => (shouldInline(comment) ? `} ${comment}` : match)
    );

    return result;
}

function limitConsecutiveReturns(css: string, maxReturns = 3): string {
    if (maxReturns < 1) {
        return css;
    }

    const pattern = new RegExp(`(\\n[ \t]*){${maxReturns + 1},}`, 'g');
    const replacement = '\n'.repeat(maxReturns);

    return css.replace(pattern, replacement);
}

export function format(
    document: vscode.TextDocument,
    range: vscode.Range | undefined,
    options: vscode.WorkspaceConfiguration
): vscode.TextEdit[] {
    let value = document.getText();
    let includesEnd = true;
    let tabSize = options.get<number>("tabSize", 4);

    const inlineCommentCounts: InlineCommentCounts = collectInlineCommentCounts(value);

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
    const cssOptions: CssBeautifyOptions = {
        indent_size: tabSize,
        indent_char: options.get<boolean>("insertSpaces", true) ? ' ' : '\t',
        end_with_newline: includesEnd && options.get<boolean>("insertFinalNewline", false),
        //selector_separator_newline: options.get<boolean>("newlineBetweenSelectors", true),
        newline_between_rules: false,
        //space_around_selector_separator: options.get<boolean>("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Collapse blocks but keep inline rules intact
        indent_empty_lines: options.get<boolean>("indentEmptyLines", false),
    max_preserve_newlines: 10, // Allow runs for custom clamping
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: options.get<number>("wrapLineLength", 0),
        eol: '\n'
    };

    let result = css_beautify(value, cssOptions);
    result = collapseSingleDeclarationBlocks(result);
    result = keepInlineCommentsOnSameLine(result, inlineCommentCounts);
    result = limitConsecutiveReturns(result);

    return [{
        range: range,
        newText: result
    }];
}

function collectInlineCommentCounts(source: string): InlineCommentCounts {
    const counts: InlineCommentCounts = new Map();

    const inlineCommentRegex = /([;}])[ \t]*(\/\*[^\n]*\*\/)/g;

    let match: RegExpExecArray | null;
    while ((match = inlineCommentRegex.exec(source)) !== null) {
        const comment = match[2].trim();
        counts.set(comment, (counts.get(comment) ?? 0) + 1);
    }

    return counts;
}
