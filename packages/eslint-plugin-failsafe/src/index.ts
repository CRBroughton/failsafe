import { noAsyncThunkInSafe } from "./rules/no-async-thunk-in-safe"
import { noRawThrowingCall } from "./rules/no-raw-throwing-call"
import { noThrowInGenBlock } from "./rules/no-throw-in-gen-block"
import { noUnusedResult } from "./rules/no-unused-result"
import { preferOptionOverNull } from "./rules/prefer-option-over-null"
import { requireMatchOnTaggedError } from "./rules/require-match-on-tagged-error"

const rules = {
  "no-raw-throwing-call": noRawThrowingCall,
  "require-match-on-tagged-error": requireMatchOnTaggedError,
  "no-unused-result": noUnusedResult,
  "no-async-thunk-in-safe": noAsyncThunkInSafe,
  "no-throw-in-gen-block": noThrowInGenBlock,
  "prefer-option-over-null": preferOptionOverNull,
}

// Rules that call ESLintUtils.getParserServices(context) — they throw if
// the consumer hasn't enabled type-aware linting (parserOptions.project /
// projectService). Kept separate so `recommendedUntyped` can skip them.
const TYPE_AWARE_RULES = new Set(["require-match-on-tagged-error", "no-unused-result"])

// Rules that ship with the plugin but are deliberately not part of either
// default config — opinionated enough (or narrow enough in applicability)
// that enabling them everywhere by default would fight legitimate code
// rather than help. Consumers opt in explicitly.
const OPT_IN_RULES = new Set(["prefer-option-over-null"])

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

// Every rule in the plugin except OPT_IN_RULES, turned on by default —
// adding a new rule to `rules` above enables it here automatically, no
// eslint.config.js edits needed downstream, unless it's added to
// OPT_IN_RULES too. `recommendedUntyped` is the same minus any rule that
// also requires type-aware linting.
const defaultRuleNames = Object.keys(rules).filter(name => !OPT_IN_RULES.has(name))
plugin.configs = {
  recommended: buildConfig(defaultRuleNames),
  recommendedUntyped: buildConfig(defaultRuleNames.filter(name => !TYPE_AWARE_RULES.has(name))),
}

export default plugin
