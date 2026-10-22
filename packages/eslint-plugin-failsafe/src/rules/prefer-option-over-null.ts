import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/packages/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "preferOption"

/**
 * Does this written type include `null` or `undefined` as a union member?
 * Purely syntactic — walks the type annotation's own AST, no type
 * information needed. Treats `undefined` the same as `null`: the
 * library's own `optionFromNullable()` treats both as absence, and
 * `T | undefined` (e.g. from `Array.prototype.find`) is at least as
 * common a case as `T | null` in practice.
 */
function containsNullish(typeNode: TSESTree.TypeNode): boolean {
  if (typeNode.type === "TSNullKeyword" || typeNode.type === "TSUndefinedKeyword") {
    return true
  }
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.some(containsNullish)
  }
  return false
}

export const preferOptionOverNull = createRule<[], MessageId>({
  name: "prefer-option-over-null",
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Option<T> over a null/undefined union anywhere a type is written — function returns and parameters, variable and property type annotations, and type aliases.",
    },
    messages: {
      preferOption: "This type includes null/undefined — consider using Option<T> instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // Covers every written type annotation that wraps a TypeNode:
      // function return types and parameters, variable declarators,
      // class/interface property and method signatures, index signatures.
      TSTypeAnnotation: (node: TSESTree.TSTypeAnnotation) => {
        if (!containsNullish(node.typeAnnotation)) {
          return
        }
        context.report({ node, messageId: "preferOption" })
      },

      // Not wrapped in a TSTypeAnnotation — the alias's type is assigned
      // directly, e.g. `type UserId = string | null`.
      TSTypeAliasDeclaration: (node: TSESTree.TSTypeAliasDeclaration) => {
        if (!containsNullish(node.typeAnnotation)) {
          return
        }
        context.report({ node: node.typeAnnotation, messageId: "preferOption" })
      },
    }
  },
})
