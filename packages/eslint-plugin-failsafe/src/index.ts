import { noAsyncThunkInSafe } from "./rules/no-async-thunk-in-safe"
import { noRawThrowingCall } from "./rules/no-raw-throwing-call"
import { noThrowInGenBlock } from "./rules/no-throw-in-gen-block"
import { noUnusedResult } from "./rules/no-unused-result"
import { requireMatchOnTaggedError } from "./rules/require-match-on-tagged-error"

const rules = {
  "no-raw-throwing-call": noRawThrowingCall,
  "require-match-on-tagged-error": requireMatchOnTaggedError,
  "no-unused-result": noUnusedResult,
  "no-async-thunk-in-safe": noAsyncThunkInSafe,
  "no-throw-in-gen-block": noThrowInGenBlock,
}

// Rules that call ESLintUtils.getParserServices(context) — they throw if
// the consumer hasn't enabled type-aware linting (parserOptions.project /
// projectService). Kept separate so `recommendedUntyped` can skip them.
const TYPE_AWARE_RULES = new Set(["require-match-on-tagged-error", "no-unused-result"])

const plugin: {
  rules: typeof rules
  configs?: {
    recommended: { plugins: { failsafe: unknown }, rules: Record<string, "error"> }
    recommendedUntyped: { plugins: { failsafe: unknown }, rules: Record<string, "error"> }
  }
} = {
  rules,
}

function buildConfig(ruleNames: string[]): { plugins: { failsafe: unknown }, rules: Record<string, "error"> } {
  return {
    plugins: { failsafe: plugin },
    rules: Object.fromEntries(
      ruleNames.map(name => [`failsafe/${name}`, "error" as const]),
    ),
  }
}

// Every rule in the plugin, turned on by default — adding a new rule to
// `rules` above enables it here automatically, no eslint.config.js edits
// needed downstream. `recommendedUntyped` is the same minus any rule that
// requires type-aware linting, for consumers that haven't enabled it.
plugin.configs = {
  recommended: buildConfig(Object.keys(rules)),
  recommendedUntyped: buildConfig(Object.keys(rules).filter(name => !TYPE_AWARE_RULES.has(name))),
}

export default plugin
