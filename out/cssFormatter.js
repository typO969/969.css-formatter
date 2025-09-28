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
function collapseSingleDeclarationBlocks(css) {
    const lines = css.split('\n');
    const output = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openBraceIndex = line.indexOf('{');
        if (openBraceIndex !== -1 && !line.trim().startsWith('@')) {
            const bodyLines = [];
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
function keepInlineCommentsOnSameLine(css, inlineCommentCounts) {
    const shouldInline = (comment) => {
        const key = comment.trim();
        const current = inlineCommentCounts.get(key);
        if (current && current > 0) {
            inlineCommentCounts.set(key, current - 1);
            return true;
        }
        return false;
    };
    let result = css.replace(/;[ \t]*\n[ \t]*(\/\*[^\n]*\*\/)/g, (match, comment) => shouldInline(comment) ? `; ${comment}` : match);
    result = result.replace(/}[ \t]*\n(?:[ \t]*\n)?[ \t]*(\/\*[^\n]*\*\/)/g, (match, comment) => (shouldInline(comment) ? `} ${comment}` : match));
    return result;
}
function limitConsecutiveReturns(css, maxReturns = 3) {
    if (maxReturns < 1) {
        return css;
    }
    const pattern = new RegExp(`(\\n[ \t]*){${maxReturns + 1},}`, 'g');
    const replacement = '\n'.repeat(maxReturns);
    return css.replace(pattern, replacement);
}
function format(document, range, options) {
    let value = document.getText();
    let includesEnd = true;
    let tabSize = options.get("tabSize", 4);
    const inlineCommentCounts = collectInlineCommentCounts(value);
    if (range) {
        let startOffset = document.offsetAt(range.start);
        let endOffset = document.offsetAt(range.end);
        value = value.substring(startOffset, endOffset);
    }
    else {
        range = new vscode.Range(new vscode.Position(0, 0), document.positionAt(value.length));
    }
    // Ensure blank lines before comments (fixes comments sticking to previous rule)
    value = value.replace(/([^\n])\n\/\*/g, '$1\n\n/*');
    // Apply formatting options
    const cssOptions = {
        indent_size: tabSize,
        indent_char: options.get("insertSpaces", true) ? ' ' : '\t',
        end_with_newline: includesEnd && options.get("insertFinalNewline", false),
        //selector_separator_newline: options.get<boolean>("newlineBetweenSelectors", true),
        newline_between_rules: false,
        //space_around_selector_separator: options.get<boolean>("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Collapse blocks but keep inline rules intact
        indent_empty_lines: options.get("indentEmptyLines", false),
        max_preserve_newlines: 10, // Allow runs for custom clamping
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: options.get("wrapLineLength", 0),
        eol: '\n'
    };
    let result = (0, js_beautify_1.css)(value, cssOptions);
    result = collapseSingleDeclarationBlocks(result);
    result = keepInlineCommentsOnSameLine(result, inlineCommentCounts);
    result = limitConsecutiveReturns(result);
    return [{
            range: range,
            newText: result
        }];
}
function collectInlineCommentCounts(source) {
    const counts = new Map();
    const inlineCommentRegex = /([;}])[ \t]*(\/\*[^\n]*\*\/)/g;
    let match;
    while ((match = inlineCommentRegex.exec(source)) !== null) {
        const comment = match[2].trim();
        counts.set(comment, (counts.get(comment) ?? 0) + 1);
    }
    return counts;
}
