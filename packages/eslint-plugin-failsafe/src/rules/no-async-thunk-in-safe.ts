import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/CRBroughton/failsafe/blob/master/packages/eslint-plugin-failsafe/docs/rules/${name}.md`,
)

type MessageId = "noAsyncThunk"

export const noAsyncThunkInSafe = createRule<[], MessageId>({
  name: "no-async-thunk-in-safe",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow passing an async thunk to safe() — it matches the sync overload and returns Ok(Promise<T>) without ever awaiting or catching the rejection.",
    },
    messages: {
      noAsyncThunk: "safe(async () => ...) matches the sync overload — it returns Ok(Promise<T>) without ever awaiting the rejection. Pass the promise directly instead: await safe(fn()).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression: (node: TSESTree.CallExpression) => {
        if (node.callee.type !== "Identifier" || node.callee.name !== "safe") {
          return
        }

        const [thunk] = node.arguments
        if (!thunk) {
          return
        }

        if (
          (thunk.type === "ArrowFunctionExpression" || thunk.type === "FunctionExpression")
          && thunk.async
        ) {
          context.report({
            node: thunk,
            messageId: "noAsyncThunk",
          })
        }
      },
    }
  },
})
