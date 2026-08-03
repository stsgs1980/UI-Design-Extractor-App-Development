// eslint-processors/md-parser.js
// Minimal parser that returns a valid AST for .md files.
// Used by rules that operate on raw text via sourceCode.getText()
// (code-block-language, emoji-in-md, unicode-graphics-in-md).
//
// These rules don't need a real AST -- they parse the raw text manually.
// But ESLint requires a valid AST with tokens/comments to not crash.

export default {
  meta: { name: "md-parser", version: "1.0.0" },
  parseForESLint(text) {
    const lines = text.split("\n");
    return {
      ast: {
        type: "Program",
        body: [],
        sourceType: "script",
        range: [0, text.length],
        loc: {
          start: { line: 1, column: 0 },
          end: { line: lines.length, column: (lines[lines.length - 1] || "").length },
        },
        tokens: [],
        comments: [],
      },
      services: { rawText: text },
      scopeManager: null,
      visitorKeys: { Program: [] },
    };
  },
};
