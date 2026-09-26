import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/packages/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "noThrow"

/**
 * Conservative check: is `node` placed directly inside the body of a
 * generator function expression that is itself argument[0] of a call to
 * gen(...)? Walks up through any non-function ancestors (if/try blocks,
 * etc.) but stops at the *nearest* enclosing function — a throw nested
 * inside another callback, or factored into a named helper, is
 * deliberately NOT recognized. Same reasoning as no-raw-throwing-call's
 * isDirectlyWrappedInSafeThunk: proving those cases actually happen
 * inside the gen() block requires interprocedural analysis this rule
 * doesn't attempt.
 */
function isDirectlyInGenBlock(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node

  while (current.parent) {
    const parent = current.parent

    if (
      parent.type === "ArrowFunctionExpression"
      || parent.type === "FunctionExpression"
      || parent.type === "FunctionDeclaration"
    ) {
      if (parent.type !== "FunctionExpression" || !parent.generator) {
        return false
      }
      const grandparent = parent.parent
      return (
        grandparent?.type === "CallExpression"
        && grandparent.callee.type === "Identifier"
        && grandparent.callee.name === "gen"
        && grandparent.arguments[0] === parent
      )
    }

    current = parent
  }

  return false
}

export const noThrowInGenBlock = createRule<[], MessageId>({
  name: "no-throw-in-gen-block",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a raw throw inside a gen() block — it escapes as a real exception instead of becoming an Err.",
    },
    messages: {
      noThrow: "A raw throw inside gen() escapes as a real exception instead of becoming an Err. Use `return yield* fail(...)` instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ThrowStatement: (node: TSESTree.ThrowStatement) => {
        if (isDirectlyInGenBlock(node)) {
          context.report({
            node,
            messageId: "noThrow",
          })
        }
      },
    }
  },
})
