// eslint-rules/unicode-policy.js
// Enforces STD-DOC-003: Unicode Policy (no emoji / Unicode graphics in code and documentation)

const emojiPattern =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/u;

const unicodeGraphicsPattern = /[\u{2500}-\u{257F}\u{2580}-\u{259F}\u{25A0}-\u{25FF}\u{2800}-\u{28FF}]/u;

const emoji = {
  meta: {
    type: "problem",
    docs: {
      description: "No emoji in source code (STD-DOC-003)",
    },
    messages: {
      noEmoji:
        "Emoji are prohibited in source code. Use text tags like [OK], [FAIL] instead (STD-DOC-003).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText();
    const lines = text.split("\n");
    return {
      Program() {
        lines.forEach((line, index) => {
          if (emojiPattern.test(line)) {
            context.report({ loc: { line: index + 1, column: 0 }, messageId: "noEmoji" });
          }
        });
      },
    };
  },
};

const unicodeGraphics = {
  meta: {
    type: "problem",
    docs: {
      description: "No Unicode box/line drawing in source code (STD-DOC-003)",
    },
    messages: {
      noUnicodeGraphics:
        "Unicode box/line drawing characters are prohibited. Use ASCII or text alternatives (STD-DOC-003).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText();
    const lines = text.split("\n");
    return {
      Program() {
        lines.forEach((line, index) => {
          if (unicodeGraphicsPattern.test(line)) {
            context.report({ loc: { line: index + 1, column: 0 }, messageId: "noUnicodeGraphics" });
          }
        });
      },
    };
  },
};

const emojiInMd = {
  meta: {
    type: "problem",
    docs: {
      description: "No emoji in Markdown documentation (STD-DOC-002 section 4.4, STD-DOC-003)",
    },
    messages: {
      emojiInMd:
        "Emoji are prohibited in Markdown documentation. Use text tags like [OK], [FAIL] instead (STD-DOC-002 section 4.4, STD-DOC-003).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText().replace(/```[\s\S]*?```/g, "");
    const lines = text.split("\n");
    return {
      Program() {
        lines.forEach((line, index) => {
          if (emojiPattern.test(line)) {
            context.report({ loc: { line: index + 1, column: 0 }, messageId: "emojiInMd" });
          }
        });
      },
    };
  },
};

const unicodeGraphicsInMd = {
  meta: {
    type: "problem",
    docs: {
      description: "No Unicode box/line drawing in Markdown documentation (STD-DOC-003)",
    },
    messages: {
      unicodeGraphicsInMd:
        "Unicode box/line drawing characters are prohibited. Use ASCII or code blocks (STD-DOC-003).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText().replace(/```[\s\S]*?```/g, "");
    const lines = text.split("\n");
    return {
      Program() {
        lines.forEach((line, index) => {
          if (unicodeGraphicsPattern.test(line)) {
            context.report({ loc: { line: index + 1, column: 0 }, messageId: "unicodeGraphicsInMd" });
          }
        });
      },
    };
  },
};

export default {
  meta: {
    name: "unicode-policy",
    version: "1.0.0",
  },
  rules: {
    "emoji": emoji,
    "unicode-graphics": unicodeGraphics,
    "emoji-in-md": emojiInMd,
    "unicode-graphics-in-md": unicodeGraphicsInMd,
  },
};
