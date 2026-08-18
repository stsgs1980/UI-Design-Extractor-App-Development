import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// --- Custom rules (STD-DOC-002 / STD-DOC-003) ---
import codeBlockLanguage from "./eslint-rules/code-block-language.mjs";
import unicodePolicy from "./eslint-rules/unicode-policy.mjs";

// --- Custom processors / parsers for .md files ---
import mdParser from "./eslint-processors/md-parser.mjs";
// markdown-snippets processor is available at ./eslint-processors/markdown-snippets.mjs
// It wraps eslint-plugin-markdown and filters parsing errors from incomplete code snippets.
// To lint CODE INSIDE .md code blocks with TS/JS rules, create a separate ESLint config
// that uses: processor: "markdown-snippets/markdown" on "**/*.md" files.

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  // ---------------------------------------------------------------
  // STD-DOC-003: No emoji / Unicode graphics in source code (.ts/.tsx/.js/.jsx)
  // ---------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    plugins: {
      "unicode-policy": unicodePolicy,
    },
    rules: {
      "unicode-policy/emoji": "error",
      "unicode-policy/unicode-graphics": "error",
    },
  },

  // ---------------------------------------------------------------
  // STD-DOC-002 section 5.4 + STD-DOC-003: Rules for .md files
  // Uses a minimal parser so rules can access raw text via sourceCode.getText()
  // ---------------------------------------------------------------
  {
    files: ["**/*.md"],
    languageOptions: {
      parser: mdParser,
    },
    plugins: {
      "code-block-language": {
        rules: { "code-block-language": codeBlockLanguage },
      },
      "unicode-policy": unicodePolicy,
    },
    rules: {
      // STD-DOC-002 section 5.4: every fenced code block must specify a language
      "code-block-language/code-block-language": "error",
      // STD-DOC-003: no emoji / Unicode graphics in documentation prose
      "unicode-policy/emoji-in-md": "error",
      "unicode-policy/unicode-graphics-in-md": "error",
    },
  },

  // ---------------------------------------------------------------
  // Rule overrides (existing project rules)
  // ---------------------------------------------------------------
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",

      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // General JavaScript rules
      "prefer-const": "warn",
      "no-unused-vars": "off", // handled by @typescript-eslint/no-unused-vars
      "no-console": "warn",
      "no-debugger": "error",
      "no-empty": "warn",
      "no-irregular-whitespace": "warn",
      "no-case-declarations": "off",
      "no-fallthrough": "warn",
      "no-mixed-spaces-and-tabs": "warn",
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unreachable": "error",
      "no-useless-escape": "warn",
    },
  },

  // ---------------------------------------------------------------
  // Ignore patterns
  // ---------------------------------------------------------------
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tailwind.config.ts",
      "examples/**",
      "skills/**",
      "eslint-rules/**",
      "eslint-processors/**",
      "upload/**",
      "download/**",
    ],
  },
];

export default eslintConfig;
