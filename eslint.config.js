import antfu from "@antfu/eslint-config"
import failsafe from "@crbroughton/eslint-plugin-failsafe"

export default antfu(
  {
    type: "lib",
    vue: true,
    stylistic: {
      indent: 2,
      quotes: "double",
      semi: false,
    },
    ignores: ["dist", "coverage"],
    typescript: {
      // Single fallback project — typescript-eslint's projectService walks
      // up from each linted file to find its own nearest real tsconfig.json
      // first (packages/failsafe and packages/eslint-plugin-failsafe each
      // have one), this is only used if that search finds nothing. Must be
      // a single string — antfu passes it straight through to
      // projectService's `defaultProject`, which doesn't accept an array.
      tsconfigPath: "packages/failsafe/tsconfig.json",
      // Restores antfu's own markdown/astro defaults, which this option
      // replaces rather than extends, plus files that sit outside every
      // real tsconfig's `include`: packages/failsafe's own root-level
      // config files, and apps/playground's uno.config.ts (Nuxt's
      // generated tsconfigs cover nuxt.config.ts but not this).
      // gen-guide-demo has its own tsconfig.json (see that directory) so
      // it's typed-linted too, not excluded here.
      ignoresTypeAware: [
        "**/*.md/**",
        "**/*.astro/*.ts",
        "packages/failsafe/build.config.ts",
        "packages/failsafe/vitest.config.ts",
        "apps/playground/uno.config.ts",
      ],
    },
  },
  {
    files: [
      "packages/failsafe/src/**/*.ts",
      "packages/eslint-plugin-failsafe/src/**/*.ts",
      "apps/playground/**/*.{ts,vue}",
    ],
    ignores: [
      "**/*.test.ts",
      "packages/failsafe/build.config.ts",
      "packages/failsafe/vitest.config.ts",
      "apps/playground/uno.config.ts",
    ],
    ...failsafe.configs.recommended,
  },
  {
    // Dogfood the plugin's own (opt-in) prefer-option-over-null rule on the
    // library's own source — nullable inputs get converted to Option/Result
    // at the boundary, so nothing past that point should write a null/
    // undefined type again. Scoped to packages/failsafe/src rather than the
    // whole repo: this is the library enforcing its own public-API policy,
    // not a project-wide style rule — unrelated packages (the eslint
    // plugin, the playground app) have their own ordinary uses of
    // `null`/`undefined` (DOM APIs, `typeof x === "object" && x !== null`
    // guards) that have nothing to do with this policy.
    files: ["packages/failsafe/src/**/*.ts"],
    ignores: [
      "**/*.test.ts",
      "**/*.type-test.ts",
      "packages/failsafe/src/option/**",
      "packages/failsafe/src/try/**",
    ],
    plugins: { failsafe },
    rules: {
      "failsafe/prefer-option-over-null": "error",
    },
  },
  {
    // antfu's vue() config wires vue-eslint-parser's nested <script> parser
    // to @typescript-eslint/parser when `typescript: true`, but never
    // forwards project info to it — so typed rules fail outright inside
    // .vue files ("don't have parserOptions set to generate type
    // information for this file"). Nuxt's own tsconfig.json is
    // references-only (`"files": []`, points at .nuxt's generated
    // per-target tsconfigs), which is exactly what projectService is
    // designed to resolve — same mechanism editors use for Vue+TS.
    files: ["apps/playground/**/*.vue"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: new URL("./apps/playground", import.meta.url).pathname,
      },
    },
  },
)
