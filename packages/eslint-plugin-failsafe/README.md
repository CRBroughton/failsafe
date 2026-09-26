# @crbroughton/eslint-plugin-failsafe

ESLint rules enforcing [`@crbroughton/failsafe`](https://www.npmjs.com/package/@crbroughton/failsafe) usage patterns — catching the library's own documented footguns before they ship.

## Install

```sh
pnpm add -D @crbroughton/eslint-plugin-failsafe
```

## Usage

Every rule is on by default via `configs.recommended`:

```js
// eslint.config.js
import antfu from "@antfu/eslint-config"
import failsafe from "@crbroughton/eslint-plugin-failsafe"

export default antfu(
  { type: "lib" },
  {
    files: ["src/**/*.ts"],
    ...failsafe.configs.recommended,
  },
)
```

Two of the five rules are type-aware (`require-match-on-tagged-error`,
`no-unused-result`) and need type-aware linting enabled for the matched
files (see [typescript-eslint's typed linting
docs](https://typescript-eslint.io/getting-started/typed-linting/)). For
consumers who haven't set that up, use `configs.recommendedUntyped`
instead — the same rules minus the ones that require type information.

## Rules

| Rule | Type-aware | Description |
| --- | --- | --- |
| [`no-raw-throwing-call`](./docs/rules/no-raw-throwing-call.md) | No | Disallow direct calls to native APIs `failsafe/try` already wraps, unless routed through `safe()` or the matching `tryX()` |
| [`require-match-on-tagged-error`](./docs/rules/require-match-on-tagged-error.md) | Yes | Require a multi-tag `.error` union to be handled with `match()`, not used directly |
| [`no-unused-result`](./docs/rules/no-unused-result.md) | Yes | Require a `Result`-producing call used as its own statement to be assigned to a variable |
| [`no-async-thunk-in-safe`](./docs/rules/no-async-thunk-in-safe.md) | No | Disallow `safe(async () => ...)` — matches the sync overload, never awaits the rejection |
| [`no-throw-in-gen-block`](./docs/rules/no-throw-in-gen-block.md) | No | Disallow a raw `throw` inside a `gen()` block — escapes as a real exception instead of becoming an `Err` |

See each rule's doc for full details, examples, and known limitations.

## License

MIT
