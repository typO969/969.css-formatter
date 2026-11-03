# 969 CSS Formatter (`nsn-css-formatter`)

An opinionated, compact CSS formatter for Visual Studio Code designed to keep stylesheets readable, concise, and intentional.

Unlike standard formatters that aggressively expand every single property into 3â€“4 lines and separate rules with mandatory blank lines, **969 CSS Formatter** collapses single-declaration rules onto one line, joins comma-separated selectors onto a single line, preserves trailing comments inline, and honors your deliberate spacing.

---

## Explicit Formatting Rules

### I have listed the rules for your quick reference here, but if you would like further clarification--keep reading.
### The rules are as follows:
1. Single-Property Rule Collapsing
2. Multi-Line Selector (Specifier) Combining
3. Trailing / Inline Comment Retention
4. No Mandatory Blank Lines Between Elements
5. Excessive Blank Line Clamping
6. String, Quote & Data URI Protection
7. Modern At-Rule & Nested Block Support
8. Top-Level Directive Isolation
9. Consecutive Header Comment Preservation
10. Buffer & Dirty-State Protection

<br>
<br>


### 1. Single-Property Rule Collapsing
Any CSS rule containing **exactly one declaration** is collapsed into a single, clean line with inner spacing. Rules with 2 or more declarations remain multi-line.

```css
/* Before */
html {
    font-size: 14px;
}

/* Formatted */
html { font-size: 14px; }
```

### 2. Multi-Line Selector (Specifier) Combining
Comma-separated selector lists that span multiple lines are automatically combined onto a single line before the opening brace `{`:

```css
/* Before */
*,
 *::before,
 *::after {
    box-sizing: border-box;
}

/* Formatted */
*, *::before, *::after { box-sizing: border-box; }
```

*(Also applies to multi-property rules)*:

```css
/* Before */
#portfolio body,
 #red,
 #media,
 .red-page {
    color: var(--white);
    background: var(--bgred);
}

/* Formatted */
#portfolio body, #red, #media, .red-page {
    color: var(--white);
    background: var(--bgred);
}
```

### 3. Trailing / Inline Comment Retention
Comments written on the **same line** following code (after `;` or `}`) remain on the same line instead of being kicked to a new line below:

```css
/* Before */
@import url("1-fonts.css") layer(fonts);    /* contains the font imports */
.card {
    background: var(--bg); /* brand background */
}

/* Formatted */
@import url("1-fonts.css") layer(fonts);    /* contains the font imports */
.card {
    background: var(--bg);    /* brand background */
}
```

### 4. No Mandatory Blank Lines Between Elements
No mandatory carriage returns or empty lines are forced between adjacent rules or `@import` statements.
* If you write rules on **adjacent lines**, they **stay adjacent**.
* If you intentionally place empty lines between sections, your empty lines are **preserved**.

```css
/* Stays adjacent if authored adjacent */
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
```

### 5. Excessive Blank Line Clamping
While deliberate empty lines between rules are preserved, runs of excessive blank lines are clamped to a clean maximum (default: 2 blank lines) to prevent accidental whitespace sprawl.

### 6. String, Quote & Data URI Protection
Semicolons and braces inside quotes (`"..."`, `'...'`), `url("data:...;...")`, or string properties (`content: ";"`) are protected by an intelligent quote scanner. They are never mistaken for declaration boundaries.

```css
/* Formatted cleanly into 1 line without breaking */
.icon { background-image: url("data:image/svg+xml;charset=utf-8,<svg></svg>"); }
```

### 7. Modern At-Rule & Nested Block Support
Recursively formats inside modern CSS container at-rules like `@layer`, `@media`, `@supports`, and `@container`. The container structure remains properly indented while single-property rules inside it collapse cleanly:

```css
/* Formatted */
@layer components {
    .badge { font-weight: bold; }
    .alert {
        padding: 12px;
        color: red;
    }
}
```

### 8. Top-Level Directive Isolation
Top-level statements ending with a semicolon (such as `@charset "UTF-8";` or `@import ...;`) are never merged into subsequent rule selectors or `@layer` blocks.

### 9. Consecutive Header Comment Preservation
Consecutive banner comments (such as file headers or section dividers) remain grouped together without unintended blank lines injected between them.

### 10. Buffer & Dirty-State Protection
If formatting produces no changes to the file, the document buffer is left untouched. This prevents VS Code from falsely marking an unchanged file as dirty/unsaved.

---

## Usage & Shortcuts

| Action | Shortcut (Windows/Linux) | Shortcut (macOS) | Command Palette (`Ctrl+Shift+P`) |
| :--- | :--- | :--- | :--- |
| **Format Document** | `Shift + Alt + F` | `Shift + Option + F` | `Format CSS (969 CSS Formatter)` |
| **Format Selection** | `Ctrl + K, Ctrl + F` | `Cmd + K, Cmd + F` | `Format Selection` |

---

## Configuration

In your VS Code `settings.json`:

```json
{
  "[css]": {
    "editor.defaultFormatter": "typo969.nsn-css-formatter",
    "editor.formatOnSave": true
  },
  "editor.tabSize": 4,
  "editor.insertSpaces": true
}
```

---

## Building & Installing

### Compile and Package to .VSIX:
```bash
# 1. Compile TypeScript
npm run compile

# 2. Package to .vsix (auto-bumps patch version)
npx @vscode/vsce package patch --no-git-tag-version
```

### Install in VS Code:
1. Open VS Code and press `Ctrl + Shift + X` (Extensions).
2. Click the `...` menu in the top-right corner of the Extensions sidebar.
3. Select **"Install from VSIX..."** and choose the generated `.vsix` file.
4. Reload the window (`Ctrl + Shift + P` -> `Developer: Reload Window`).

---

## License
MIT © typo969
