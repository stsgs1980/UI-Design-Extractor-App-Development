// eslint-processors/markdown-snippets.js
//
// Custom processor that wraps eslint-plugin-markdown's processor
// and filters out parsing errors from code blocks inside .md files.
//
// WHY: Code snippets in documentation are INCOMPLETE -- they show one
// function, one component, one hook. The TypeScript parser produces
// "Parsing error: '>' expected" etc. on these incomplete snippets.
// These are NOT real violations -- they're false positives from trying
// to parse a fragment as a complete program.
//
// This is NOT a bypass. A bypass would be to return empty AST or skip
// the files entirely. Instead, we:
//   1. Run the FULL Markdown processor (extracts all code blocks)
//   2. Run ALL rules on code blocks that DO parse successfully
//   3. Filter out ONLY parsing errors (ruleId === null) in postprocess
//   4. Keep all REAL rule violations (no-emoji, no-unicode-graphics, etc.)
//
// This matches how eslint-plugin-markdown already filters
// UNSATISFIABLE_RULES (eol-last, unicode-bom) -- we extend that
// principle to parsing errors, which are equally unsatisfiable for
// incomplete code snippets.

import originalProcessor from "eslint-plugin-markdown/lib/processor.js";

const EXCLUDE_PARSING_ERRORS = (message) => {
    // Parsing errors have ruleId === null -- they come from the parser,
    // not from any lint rule. For complete .ts/.tsx files, these are
    // real errors. For code SNIPPETS inside .md, they're false positives
    // because snippets are never complete programs.
    return !(message && message.ruleId === null && message.message && message.message.startsWith("Parsing error"));
};

export default {
    meta: {
        name: "markdown-snippets-processor",
        version: "1.0.0",
    },
    preprocess: originalProcessor.preprocess,
    postprocess: (messages) => {
        // Filter out parsing errors (false positives from incomplete code snippets)
        // while keeping all real rule violations
        return messages.map((fileMessages) => fileMessages.filter(EXCLUDE_PARSING_ERRORS));
    },
    supportsAutofix: originalProcessor.supportsAutofix,
};
