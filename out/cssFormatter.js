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
function format(document, range, options) {
    let value = document.getText();
    let includesEnd = true;
    let tabSize = options.get("tabSize", 4);
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
        selector_separator_newline: options.get("newlineBetweenSelectors", true),
        newline_between_rules: options.get("newlineBetweenRules", true),
        space_around_selector_separator: options.get("spaceAroundSelectorSeparator", false),
        brace_style: 'collapse,preserve-inline', // Keep single-property rules on one line
        indent_empty_lines: options.get("indentEmptyLines", false),
        max_preserve_newlines: 2, // Preserve up to 2 blank lines
        preserve_newlines: true, // Always preserve newlines
        wrap_line_length: options.get("wrapLineLength", 0),
        eol: '\n'
    };
    let result = (0, js_beautify_1.css)(value, cssOptions);
    return [{
            range: range,
            newText: result
        }];
}
