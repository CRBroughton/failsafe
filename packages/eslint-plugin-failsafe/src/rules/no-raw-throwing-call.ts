import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "wrapWithSafe"

interface ThrowingPattern {
  /** Human-readable name of the wrapped native call, for the message. */
  label: string
  /** The matching try* helper this call should be replaced with. */
  tryHelper: string
}

/**
 * Mirrors @crbroughton/failsafe/try's own table exactly — every native
 * call it wraps, keyed by how this rule recognizes a call to it. Kept in
 * one place so the rule and the library can't silently drift apart.
 */
const MEMBER_PATTERNS: Record<string, Record<string, ThrowingPattern>> = {
  JSON: {
    parse: { label: "JSON.parse", tryHelper: "tryJSONParse" },
    stringify: { label: "JSON.stringify", tryHelper: "tryJSONStringify" },
  },
  localStorage: {
    getItem: { label: "localStorage.getItem", tryHelper: "tryLocalStorageGet" },
    setItem: { label: "localStorage.setItem", tryHelper: "tryLocalStorageSet" },
  },
}

const IDENTIFIER_PATTERNS: Record<string, ThrowingPattern> = {
  decodeURIComponent: { label: "decodeURIComponent", tryHelper: "tryURIDecode" },
  encodeURIComponent: { label: "encodeURIComponent", tryHelper: "tryURIEncode" },
  atob: { label: "atob", tryHelper: "tryBase64Decode" },
  btoa: { label: "btoa", tryHelper: "tryBase64Encode" },
  structuredClone: { label: "structuredClone", tryHelper: "tryStructuredClone" },
}

const NEW_EXPRESSION_PATTERNS: Record<string, ThrowingPattern> = {
  URL: { label: "new URL(...)", tryHelper: "tryURL" },
}

function matchMemberCall(node: TSESTree.CallExpression): ThrowingPattern | undefined {
  if (node.callee.type !== "MemberExpression") {
    return undefined
  }
  const { object, property } = node.callee
  if (object.type !== "Identifier" || property.type !== "Identifier") {
    return undefined
  }
  return MEMBER_PATTERNS[object.name]?.[property.name]
}

function matchIdentifierCall(node: TSESTree.CallExpression): ThrowingPattern | undefined {
  if (node.callee.type !== "Identifier") {
    return undefined
  }
  return IDENTIFIER_PATTERNS[node.callee.name]
}

function matchNewExpression(node: TSESTree.NewExpression): ThrowingPattern | undefined {
  if (node.callee.type !== "Identifier") {
    return undefined
  }
  return NEW_EXPRESSION_PATTERNS[node.callee.name]
}

/**
 * Conservative check: is `node` placed directly inside the body of a
 * non-async arrow/function expression that is itself argument[0] of a
 * call to `safe(...)`? Walks up through any non-function ancestors
 * (return statements, ternaries, template literals, etc.) but stops at
 * the *nearest* enclosing function — anything nested inside another
 * callback, or factored into a named helper, is deliberately NOT
 * recognized. See the rule's docs for why: proving those cases are
 * actually protected requires interprocedural analysis this rule
 * doesn't attempt.
 *
 * Async thunks are explicitly excluded: a synchronous throw inside an
 * `async () => {}` never reaches safe()'s try/catch — it becomes a
 * rejected Promise instead, which `Ok(promise)` then silently swallows.
 */
function isDirectlyWrappedInSafeThunk(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node

  while (current.parent) {
    const parent = current.parent

    if (
      parent.type === "ArrowFunctionExpression"
      || parent.type === "FunctionExpression"
      || parent.type === "FunctionDeclaration"
    ) {
      if (parent.type === "FunctionDeclaration" || parent.async) {
        return false
      }
      const grandparent = parent.parent
      return (
        grandparent?.type === "CallExpression"
        && grandparent.callee.type === "Identifier"
        && grandparent.callee.name === "safe"
        && grandparent.arguments[0] === parent
      )
    }

    current = parent
  }

  return false
}

export const noRawThrowingCall = createRule<[], MessageId>({
  name: "no-raw-throwing-call",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct calls to native APIs that @crbroughton/failsafe/try already wraps, unless routed through safe() or the matching tryX() helper.",
    },
    messages: {
      wrapWithSafe: "{{label}} throws on invalid input. Wrap it in safe(() => ...) or use {{tryHelper}}() instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node, pattern: ThrowingPattern): void {
      if (isDirectlyWrappedInSafeThunk(node)) {
        return
      }
      context.report({
        node,
        messageId: "wrapWithSafe",
        data: { label: pattern.label, tryHelper: pattern.tryHelper },
      })
    }

    return {
      CallExpression(node) {
        const pattern = matchMemberCall(node) ?? matchIdentifierCall(node)
        if (pattern) {
          report(node, pattern)
        }
      },
      NewExpression(node) {
        const pattern = matchNewExpression(node)
        if (pattern) {
          report(node, pattern)
        }
      },
    }
  },
})
