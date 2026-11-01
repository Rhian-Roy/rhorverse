import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Matches raw hex colours (#fff, #a1b2c3, #a1b2c3ff) and arbitrary hex values like bg-[#123456].
const RAW_HEX = String.raw`/#[0-9a-fA-F]{3,8}\b/`;
// Tailwind default palette names. Our palette is tokens-only (see packages/tokens).
const DEFAULT_PALETTE = String.raw`/\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/`;

const HEX_MSG = "No raw hex in className. Add a token in packages/tokens/tokens.json.";
const restricted = [
  { selector: `JSXAttribute[name.name='className'] Literal[value=${RAW_HEX}]`, message: HEX_MSG },
  { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${RAW_HEX}]`, message: HEX_MSG },
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=${DEFAULT_PALETTE}]`,
    message: "Tailwind default colours are disabled. Use Understory tokens.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": ["error", ...restricted],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "lucide-react", message: "Use @phosphor-icons/react (regular weight)." },
            { name: "framer-motion", message: 'Import from "motion/react".' },
          ],
          patterns: [{ group: ["@/components/ui/*"], message: "No shadcn/ui. Use Radix primitives directly." }],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
