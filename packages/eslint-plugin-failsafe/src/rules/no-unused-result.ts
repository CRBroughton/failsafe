import type { TSESTree } from "@typescript-eslint/utils"
import type * as ts from "typescript"
import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "unusedResult"

/**
 * Is `type` shaped like a real Result<T, E> — a union with both an
 * `ok: true` and an `ok: false` member? Structural, not name-based, so
 * this matches any Result-returning function, not just the library's own
 * safe()/tryX()/gen(). Requiring both branches (rather than just an
 * `ok: false` member) is what excludes an already-narrowed single-branch
 * shape, e.g. `{ ok: false, error: ... }` alone.
 */
function isResultShaped(type: ts.Type, checker: ts.TypeChecker): boolean {
  const constituents = type.isUnion() ? type.types : [type]
  let sawOkTrue = false
  let sawOkFalse = false

  for (const member of constituents) {
    const okProp = member.getProperty("ok")
    if (!okProp) {
      continue
    }
    const okType = checker.getTypeOfSymbol(okProp)
    const okLiteral = checker.typeToString(okType)
    if (okLiteral === "true") {
      sawOkTrue = true
    }
    if (okLiteral === "false") {
      sawOkFalse = true
    }
  }

  return sawOkTrue && sawOkFalse
}

export const noUnusedResult = createRule<[], MessageId>({
  name: "no-unused-result",
  meta: {
    type: "problem",
    docs: {
      description: "Require a Result-producing call used as its own statement to be assigned to a variable, so the Err case isn't silently discarded.",
    },
    messages: {
      unusedResult: "This Result is discarded — assign it to a variable (even if you don't act on it further) so the Err case isn't silently lost.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    return {
      ExpressionStatement: (node: TSESTree.ExpressionStatement) => {
        const expr = node.expression
        if (expr.type !== "CallExpression" && expr.type !== "AwaitExpression") {
          return
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(expr)
        const type = checker.getTypeAtLocation(tsNode)
        if (!isResultShaped(type, checker)) {
          return
        }

        context.report({
          node: expr,
          messageId: "unusedResult",
        })
      },
    }
  },
})
