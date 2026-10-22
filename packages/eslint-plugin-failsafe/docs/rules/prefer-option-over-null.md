# prefer-option-over-null

Prefer `Option<T>` over a `null`/`undefined` union anywhere a type is
written — function return types and parameters, variable and property
type annotations, and type aliases.

**This rule is opt-in — it is not included in `configs.recommended` or
`configs.recommendedUntyped`.** Enable it explicitly:

```js
export default antfu({}, {
  rules: {
    "failsafe/prefer-option-over-null": "warn",
  },
})
```

## Rule details

`@crbroughton/failsafe` removed `null` from its own public API in favor
of `Option<T>` — a missing value and a real failure are different things,
and `Option` keeps them distinct the same way `Result` keeps a success
and an error distinct. This rule flags the same pattern anywhere in your
own code: any written type — a function's return type or a parameter, a
variable or property's type annotation, a type alias — that is (or
includes, in a union) `null` or `undefined`.

It's deliberately opt-in rather than part of the default recommended set:
plenty of legitimate `null`/`undefined` types exist that have nothing to
do with this library (DOM APIs, third-party interfaces you don't control,
etc.), and enabling this everywhere by default would fight those cases
rather than help.

It's pure syntax — no type information needed, so it applies everywhere,
including files without type-aware linting enabled. It checks *written*
type annotations only; an inferred type that includes `null`/`undefined`
is never flagged if nothing was written down.

`undefined` is treated the same as `null` — the library's own
`optionFromNullable()` treats both as absence, and `T | undefined` (e.g.
`Array.prototype.find`'s real return type) is at least as common as
`T | null` in practice.

👎 Examples of **incorrect** code:

```ts
function findUser(id: string): User | null {
  return users.find(u => u.id === id) ?? null
}

function findUser(id: string): User | undefined {
  return users.find(u => u.id === id)
}

function greet(name: string | null) { /* ... */ }

const currentUser: User | null = null

interface Session {
  user: User | null
}

type UserId = string | null
```

👍 Examples of **correct** code:

```ts
function findUser(id: string): Option<User> {
  return optionFromNullable(users.find(u => u.id === id))
}

interface Session {
  user: Option<User>
}
```

## Limitations

Only checks *written* type annotations — a function, variable, or
property with no type annotation at all is never flagged, even if
TypeScript would infer one that includes `null`/`undefined`. Generic
type parameter defaults (`<T = null>`) and nested type arguments
(`Array<string | null>`) are not currently checked — only a union that is
written directly as the annotation itself.

## When not to use it

If your codebase's `null`/`undefined` returns are unrelated to this
library's `Option` type — DOM APIs, external library interfaces, etc. —
don't enable this rule for those files.
