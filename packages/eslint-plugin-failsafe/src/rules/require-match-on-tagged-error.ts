import type { TSESTree } from "@typescript-eslint/utils"
import type * as ts from "typescript"
import { ESLintUtils } from "@typescript-eslint/utils"
import { getKeys } from "eslint-visitor-keys"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/packages/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "requireMatch" | "missingMatch"

/**
 * If `type` is a union of 2+ variants that each carry their own
 * string-literal `tag` property (the same shape match()'s own
 * `E extends { tag: string }` constraint expects), returns the literal tag
 * values. Returns null for anything else — a single type, a union where
 * some member lacks a `tag`, or a `tag` that isn't a literal.
 */
function getTagLiterals(type: ts.Type, checker: ts.TypeChecker): string[] | null {
  if (!type.isUnion() || type.types.length < 2) {
    return null
  }

  const tags: string[] = []
  for (const member of type.types) {
    const tagProp = member.getProperty("tag")
    if (!tagProp) {
      return null
    }
    const tagType = checker.getTypeOfSymbol(tagProp)
    if (!tagType.isStringLiteral()) {
      return null
    }
    tags.push(tagType.value)
  }
  return tags
}

/**
 * Given the type of a Result<T, E> (i.e. Ok<T> | Err<E>) at the point
 * before* narrowing, finds the union member(s) shaped like Err<E>
 * (an `ok` property whose type is literally `false`) and returns their
 * `error` property type. Returns null if `type` isn't Result-shaped at
 * all — no member has an `ok: false` property.
 */
function getErrorTypeFromResult(type: ts.Type, checker: ts.TypeChecker): ts.Type | null {
  const constituents = type.isUnion() ? type.types : [type]
  let errorType: ts.Type | null = null

  for (const member of constituents) {
    const okProp = member.getProperty("ok")
    if (!okProp) {
      continue
    }
    const okType = checker.getTypeOfSymbol(okProp)
    if (checker.typeToString(okType) !== "false") {
      continue
    }
    const errorProp = member.getProperty("error")
    if (errorProp) {
      // Result<T, E> only ever has one Err<E> member in practice — the
      // last one found wins, which is the only one for any real Result.
      errorType = checker.getTypeOfSymbol(errorProp)
    }
  }

  return errorType
}

/**
 * Is `node` used somewhere this rule already considers handled?
 * - Direct first argument to match(...): match(result.error, {...})
 * - The init of a variable declarator: const e = result.error — deliberately
 *   not traced any further once assigned, see the rule's docs.
 */
function isAllowedUsage(node: TSESTree.Node): boolean {
  const parent = node.parent
  if (!parent) {
    return false
  }

  if (
    parent.type === "CallExpression"
    && parent.callee.type === "Identifier"
    && parent.callee.name === "match"
    && parent.arguments[0] === node
  ) {
    return true
  }

  if (parent.type === "VariableDeclarator" && parent.init === node) {
    return true
  }

  return false
}

/**
 * Does `node`'s subtree contain a `.error` property access anywhere?
 * Generic recursive walk via eslint-visitor-keys, rather than a match()
 * call specifically — this check exists to catch branches that never
 * touch the error at all (e.g. `if (isErr(result)) { console.log("oops") }`),
 * which is a distinct, non-overlapping case from the MemberExpression
 * visitor below (that one only ever fires once `.error` *is* accessed).
 */
function containsErrorPropertyAccess(node: TSESTree.Node): boolean {
  if (
    node.type === "MemberExpression"
    && !node.computed
    && node.property.type === "Identifier"
    && node.property.name === "error"
  ) {
    return true
  }

  for (const key of getKeys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key]
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isNode(item) && containsErrorPropertyAccess(item)) {
          return true
        }
      }
    }
    else if (isNode(child) && containsErrorPropertyAccess(child)) {
      return true
    }
  }
  return false
}

function isNode(value: unknown): value is TSESTree.Node {
  return typeof value === "object" && value !== null && "type" in value
}

export const requireMatchOnTaggedError = createRule<[], MessageId>({
  name: "require-match-on-tagged-error",
  meta: {
    type: "problem",
    docs: {
      description: "Require a tagged error union (2+ variants) accessed via `.error` to be handled with match(), not used directly.",
    },
    messages: {
      requireMatch: "This error has multiple tags ({{tags}}) — handle it exhaustively with match(error, {...}) instead of using it directly.",
      missingMatch: "This isErr() branch has multiple error tags ({{tags}}) but never handles result.error — call match(error, {...}) to handle them exhaustively.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    return {
      "MemberExpression[computed=false]": (node: TSESTree.MemberExpression) => {
        if (node.property.type !== "Identifier" || node.property.name !== "error") {
          return
        }
        if (isAllowedUsage(node)) {
          return
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(node)
        const type = checker.getTypeAtLocation(tsNode)
        const tags = getTagLiterals(type, checker)
        if (!tags) {
          return
        }

        context.report({
          node,
          messageId: "requireMatch",
          data: { tags: tags.join(" | ") },
        })
      },

      "IfStatement": (node: TSESTree.IfStatement) => {
        const test = node.test
        if (
          test.type !== "CallExpression"
          || test.callee.type !== "Identifier"
          || test.callee.name !== "isErr"
          || test.arguments.length !== 1
        ) {
          return
        }

        const arg = test.arguments[0]
        if (!arg) {
          return
        }
        const tsArgNode = services.esTreeNodeToTSNodeMap.get(arg)
        const resultType = checker.getTypeAtLocation(tsArgNode)
        const errorType = getErrorTypeFromResult(resultType, checker)
        if (!errorType) {
          return
        }

        const tags = getTagLiterals(errorType, checker)
        if (!tags) {
          return
        }

        if (containsErrorPropertyAccess(node.consequent)) {
          return
        }

        context.report({
          node: test,
          messageId: "missingMatch",
          data: { tags: tags.join(" | ") },
        })
      },
    }
  },
})
