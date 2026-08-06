// eslint-rules/code-block-language.js
// Enforces STD-DOC-002 section 5.4: every fenced code block must specify a language
// Derived from: DOC-002-eslint-integration.md section 10.5.1
//
// Tracks open/close state to only flag OPENING fences that lack a language.
// A closing fence (``` after an opening fence) is never flagged.

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require language specification in fenced code blocks (STD-DOC-002 section 5.4)",
    },
    messages: {
      missingLanguage:
        "Code block must specify a language. Use 'text' or 'bash' if unknown (STD-DOC-002 section 5.4).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const text = sourceCode.getText();
    const lines = text.split("\n");

    // Match any fence line: opening or closing
    const fenceRegex = /^(\`{3,})(.*)$/;

    return {
      Program() {
        let insideCodeBlock = false;

        lines.forEach((line, index) => {
          const match = fenceRegex.exec(line.trimStart());
          if (!match) return;

          const fenceLen = match[1].length;
          const afterFence = match[2] || "";

          if (!insideCodeBlock) {
            // This is an opening fence
            if (afterFence.trim() === "") {
              // No language specified on opening fence -- violation
              context.report({
                loc: { line: index + 1, column: 0 },
                messageId: "missingLanguage",
              });
            }
            insideCodeBlock = true;
          } else {
            // This is a closing fence (or another opening with >= backticks)
            // Check if it's actually a closing fence (no language after it)
            // or a nested opening (which is rare but possible)
            // Simple heuristic: if afterFence is empty, it's a closing fence
            if (afterFence.trim() === "") {
              insideCodeBlock = false;
            }
            // If it has a language, it's a new opening (rare but handle it)
          }
        });
      },
    };
  },
};
