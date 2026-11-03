"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = format;
const vscode = __importStar(require("vscode"));
const js_beautify_1 = require("js-beautify");
/**
 * Combines multi-line comma-separated selector lists into a clean single line
 * while preserving leading comments, indentation, and top-level statements like @charset and @import.
 */
function cleanSelectorPart(rawSelector) {
    // Separate any preceding top-level statements ending in ";" (like @charset or @import)
    let lastSemi = -1;
    let inString = null;
    let inComment = false;
    for (let k = 0; k < rawSelector.length; k++) {
        const ch = rawSelector[k];
        const next = rawSelector[k + 1];
        if (inComment) {
            if (ch === '*' && next === '/') {
                inComment = false;
                k++;
            }
        }
        else if (inString) {
            if (ch === '\\') {
                k++;
            }
            else if (ch === inString) {
                inString = null;
            }
        }
        else {
            if (ch === '/' && next === '*') {
                inComment = true;
                k++;
            }
            else if (ch === '"' || ch === "'") {
                inString = ch;
            }
            else if (ch === ';') {
                lastSemi = k;
            }
        }
    }
    let prefix = '';
    let selector = rawSelector;
    if (lastSemi !== -1) {
        prefix = rawSelector.slice(0, lastSemi + 1);
        selector = rawSelector.slice(lastSemi + 1);
    }
    // In the actual selector, combine multi-line comma-separated selector lists
    let commentPrefix = '';
    let rem = selector;
    const commentMatch = rem.match(/^([\s\S]*?\*\/)([ \t]*\r?\n[ \t]*)/);
    if (commentMatch) {
        commentPrefix = commentMatch[1] + commentMatch[2];
        rem = rem.slice(commentMatch[0].length);
    }
    else {
        const leadingMatch = rem.match(/^(\r?\n[ \t]*)/);
        if (leadingMatch) {
            commentPrefix = leadingMatch[1];
            rem = rem.slice(leadingMatch[0].length);
        }
    }
    const indentMatch = rem.match(/^([ \t]*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    // Only combine if it contains a comma (a multi-line selector list)
    if (rem.includes(',')) {
        const lines = rem.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
            const joined = lines.join(' ').replace(/\s*,\s*/g, ', ');
            return prefix + (commentPrefix ? commentPrefix : "") + indent + joined;
        }
    }
    return prefix + selector.replace(/[ \t]+$/, '');
}
/**
 * Intelligent CSS Formatter Post-Processor
 * - Combines comma-separated selector lists across multiple lines into a single line
 * - Collapses single-declaration blocks into one line
 * - Preserves multi-declaration blocks formatted across multiple lines
 * - Handles quotes, data URIs, and at-rules
 */
function collapseSingleDeclarationsSafe(css) {
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
        let inString = null;
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
            }
            else if (inString) {
                if (ch === '\\') {
                    j += 2;
                    continue;
                }
                else if (ch === inString) {
                    inString = null;
                }
            }
            else {
                if (ch === '/' && next === '*') {
                    inComment = true;
                    j += 2;
                    continue;
                }
                else if (ch === '"' || ch === "'") {
                    inString = ch;
                }
                else if (ch === '{') {
                    depth++;
                    hasNestedBlock = true;
                }
                else if (ch === '}') {
                    depth--;
                    if (depth === 0)
                        break;
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
        let inBodyString = null;
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
            }
            else if (inBodyString) {
                if (ch === '\\') {
                    k++;
                }
                else if (ch === inBodyString) {
                    inBodyString = null;
                }
            }
            else {
                if (ch === '/' && next === '*') {
                    inBodyComment = true;
                    k++;
                }
                else if (ch === '"' || ch === "'") {
                    inBodyString = ch;
                }
                else if (ch === ':') {
                    hasColon = true;
                    nonCommentText += ch;
                }
                else if (ch === ';') {
                    declCount++;
                    nonCommentText = '';
                    hasColon = false;
                }
                else if (!/\s/.test(ch)) {
                    nonCommentText += ch;
                }
            }
        }
        if (hasColon && nonCommentText.length > 0) {
            declCount++;
        }
        const cleanedSel = cleanSelectorPart(rawSelector);
        if (declCount === 1 && !isContainerAtRule) {
            const cleanedBody = body
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .join(' ');
            result += cleanedSel + ' { ' + cleanedBody + ' }';
        }
        else {
            result += cleanedSel + ' {' + body + '}';
        }
        i = closeBrace + 1;
    }
    return result;
}
/**
 * Collects inline comments that trail code on the same line in the source CSS.
 */
function collectTrailingComments(source) {
    const counts = new Map();
    const lines = source.split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^(.+?)[ \t]+(\/\*[\s\S]*?\*\/)[ \t]*$/);
        if (match && match[1].trim().length > 0 && !match[1].trim().startsWith('/*')) {
            const comment = match[2].trim();
            counts.set(comment, (counts.get(comment) || 0) + 1);
        }
    }
    return counts;
}
/**
 * Re-attaches trailing comments to the preceding statement (after ; or }).
 */
function reattachTrailingComments(formattedCss, trailingComments) {
    return formattedCss.replace(/([;}])[ \t]*\r?\n[ \t]*(\/\*[\s\S]*?\*\/)/g, (match, punct, comment) => {
        const trimmedComment = comment.trim();
        const count = trailingComments.get(trimmedComment) || 0;
        if (count > 0) {
            trailingComments.set(trimmedComment, count - 1);
            return `${punct}    ${trimmedComment}`;
        }
        return match;
    });
}
/**
 * Clamps consecutive blank lines to the allowed maximum.
 */
function clampBlankLines(css, maxBlankLines = 2) {
    if (maxBlankLines < 1)
        return css;
    const maxNewlines = maxBlankLines + 1;
    const pattern = new RegExp(`(\\n[ \\t]*){${maxNewlines + 1},}`, 'g');
    const replacement = '\n'.repeat(maxNewlines);
    return css.replace(pattern, replacement);
}
function format(document, range, formattingOptions, editorConfig) {
    let value = document.getText();
    let includesEnd = true;
    // Track comments that were originally inline/trailing on the same line
    const trailingCommentCounts = collectTrailingComments(value);
    // Use document-specific formatting options when available, falling back to workspace config
    let tabSize = formattingOptions?.tabSize ?? editorConfig.get("tabSize", 4);
    let insertSpaces = formattingOptions?.insertSpaces ?? editorConfig.get("insertSpaces", true);
    if (range) {
        let startOffset = document.offsetAt(range.start);
        let endOffset = document.offsetAt(range.end);
        value = value.substring(startOffset, endOffset);
    }
    else {
        range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
    }
    // Apply formatting options (keeping archived configuration options intact)
    const cssOptions = {
        indent_size: tabSize,
        indent_char: insertSpaces ? ' ' : '\t',
        end_with_newline: includesEnd && editorConfig.get("insertFinalNewline", false),
        selector_separator_newline: false,
        //selector_separator_newline: editorConfig.get<boolean>("newlineBetweenSelectors", true),
        //newline_between_rules: editorConfig.get<boolean>("newlineBetweenRules", true),
        newline_between_rules: false, // Prevents mandatory carriage return between every element
        space_around_selector_separator: true,
        //space_around_selector_separator: editorConfig.get<boolean>("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Collapse blocks but keep inline rules intact
        indent_empty_lines: editorConfig.get("indentEmptyLines", false),
        max_preserve_newlines: 10, // Allow js-beautify to retain blank lines for our custom clamp
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: editorConfig.get("wrapLineLength", 0),
        eol: '\n'
    };
    let result = (0, js_beautify_1.css)(value, cssOptions);
    // Post-processing: Combine selectors, collapse single declaration blocks, and re-attach trailing comments
    result = collapseSingleDeclarationsSafe(result);
    result = reattachTrailingComments(result, trailingCommentCounts);
    const maxBlankLines = editorConfig.get("maxPreserveNewlines", 2);
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
