# Getting to `gen()` — a progression

This walks through the same problem four times, each version fixing something
wrong with the last, ending at the pattern used in this repo's `gen.vue`
login demo:

```ts
const login = await gen(async function* () {
  const { token, userId } = yield * unwrap(await postLogin(email, password))
  const user = yield * unwrap(await fetchUserProfile(userId))
  return { user, token }
})
```

The problem, throughout: log a user in (`postLogin`), then fetch their
profile using the id that came back (`fetchUserProfile`). Both steps can
fail. The second step can't even start until the first succeeds.

Shared types, used at every step:

```ts
type NetworkError = TaggedError<"NetworkError", { url: string, status: number }>
interface LoginStep { token: string, userId: string }
interface UserProfile { userId: string, name: string }
```

## Step 0: the typical way — `try`/`catch`

`postLogin` and `fetchUserProfile` throw on failure, the way most HTTP
client code is written by default:

```ts
async function postLogin(email: string, password: string): Promise<LoginStep> {
  if (password === "wrong-password") {
    throw new Error(`login failed for ${email}: 401`)
  }
  await delay(undefined, 200)
  return { token: "tok_abc123", userId: "user_1" }
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (userId !== "user_1") {
    throw new Error(`no such user: ${userId}`)
  }
  await delay(undefined, 200)
  return { userId: "user_1", name: "Craig" }
}

async function login(email: string, password: string) {
  try {
    const { token, userId } = await postLogin(email, password)
    try {
      const user = await fetchUserProfile(userId)
      return { user, token }
    }
    catch (err) {
      console.error("could not fetch profile:", err)
      throw err
    }
  }
  catch (err) {
    console.error("could not log in:", err)
    throw err
  }
}
```

What's wrong with this, concretely:

- **Nesting grows with every step.** Three sequential fallible calls means
  three levels of nesting. This is famously called "callback hell"'s
  cousin — `try` hell.
- **The error type is a lie.** `catch (err)` gives you `err: unknown` (or
  `any` pre-TS 4.4). Both `postLogin` and `fetchUserProfile` just throw
  plain `Error`s with a message baked in as a string — there's no way for
  calling code to tell a 401 from a 404 without parsing that string.
- **Nothing distinguishes "which step failed."** Both catches just log and
  rethrow. If you *did* want different behavior per failure (show "wrong
  password" vs. "couldn't load your profile"), you'd need to inspect
  `err.message` with string matching, or tag the error object yourself and
  hope every throw site remembers to.
- **Forgetting a `try` is silent.** Delete the inner `try`/`catch` by
  accident and the function still compiles — it just now throws further up
  than you intended, maybe past code that assumed it couldn't.

## Step 1: `Result` + `safe()` — errors become values

The core idea: instead of a function that either returns a value *or*
throws, write functions that always return a `Result<T, E>` —
`{ ok: true, value: T }` or `{ ok: false, error: E }`.

```ts
async function postLogin(email: string, password: string): Promise<Result<LoginStep, NetworkError>> {
  if (password === "wrong-password") {
    return Err({ tag: "NetworkError", url: "/api/login", status: 401 })
  }
  await delay(undefined, 200)
  return Ok({ token: "tok_abc123", userId: "user_1" })
}

async function fetchUserProfile(userId: string): Promise<Result<UserProfile, NetworkError>> {
  if (userId !== "user_1") {
    return Err({ tag: "NetworkError", url: `/api/users/${userId}`, status: 404 })
  }
  await delay(undefined, 200)
  return Ok({ userId: "user_1", name: "Craig" })
}
```

(If these were wrapping a real throwing call — `fetch(...)`, `JSON.parse`,
etc. — you'd reach for `safe()` to do the catching instead of writing your
own `if`/`throw` logic. Here the "failure" is just a branch, so `Ok`/`Err`
are constructed directly — `safe()` isn't needed when nothing actually
throws.)

Now compose them by checking `isErr` after each step:

```ts
async function login(email: string, password: string) {
  const loginResult = await postLogin(email, password)
  if (isErr(loginResult)) {
    return loginResult // bail out with the same Err
  }
  const { token, userId } = loginResult.value

  const userResult = await fetchUserProfile(userId)
  if (isErr(userResult)) {
    return userResult
  }
  const user = userResult.value

  return Ok({ user, token })
}
```

What improved:

- **The error type is real.** `loginResult.error` is `NetworkError`, not
  `unknown`. TypeScript knows its shape; autocomplete works; a typo in a
  field name is a compile error.
- **Nothing throws.** `login()`'s caller gets a `Result` back and *has* to
  deal with both cases — there's no invisible exception that can skip past
  code that assumed it was safe.
- **No nesting.** Two sequential steps are two sequential blocks, not two
  levels of indentation.

What's still not great:

- **The `if (isErr(...)) return ...` is boilerplate, and it repeats per
  step.** Three fallible steps means writing that same three-line check
  three times. It's mechanical, easy to copy-paste wrong (return the wrong
  variable), and it's pure noise — you don't actually care *how* the
  short-circuit happens, just that it does.
- **This is exactly what `gen()` exists to remove.**

## Step 2: `gen()` + `fail()` + `unwrap()` — the boilerplate disappears

```ts
const login = await gen(async function* () {
  const { token, userId } = yield * unwrap(await postLogin(email, password))
  const user = yield * unwrap(await fetchUserProfile(userId))
  return { user, token }
})
```

Same logic as Step 1, but every `if (isErr(...)) return ...` block has
collapsed into one `yield* unwrap(...)`. Read it top to bottom as the happy
path — "get the login step's value, then get the profile's value, then
return both" — and trust that a failure at either `yield*` line
short-circuits the whole block for you, returning that error as the final
`Result`.

Mechanically, in plain English:

- `gen(block)` runs `block` and packages whatever comes out into a
  `Result<T, E>` (or `Promise<Result<T, E>>`, if `block` is an
  `async function*`, which is why we `await` it here).
- `unwrap(result)` hands you the success value — or, if it's an `Err`,
  causes the *whole `gen()` block* to exit early with that same error.
- `yield*` is what makes that early exit actually happen. It's a real
  JavaScript generator keyword ("delegate to this other generator, and
  propagate its early exit as my own"), not failsafe magic — but you
  always pair it with `unwrap(...)` or `fail(...)`, never called alone.
- `fail(error)` is `unwrap`'s counterpart for a check that isn't already
  wrapped in a `Result` — e.g. `if (!email.includes("@")) return yield*
  fail({ tag: "InvalidEmail", email })`.

`postLogin` and `fetchUserProfile` can stay exactly as they were in Step 1
— `gen()` composes any `Result`-returning functions, it doesn't require
them to be written any particular way. But this repo's actual
`login.post.ts` also rewrites them internally with `gen()`/`fail()`, purely
for idiom consistency (every function in the file follows the same shape),
not because either one strictly needs it:

```ts
function postLogin(email: string, password: string): Promise<Result<LoginStep, NetworkError>> {
  return gen(async function* () {
    if (password === "wrong-password") {
      return yield * fail<NetworkError>({ tag: "NetworkError", url: `/api/login?email=${email}`, status: 401 })
    }
    await delay(undefined, 200)
    return { token: "tok_abc123", userId: "user_1" }
  })
}

function fetchUserProfile(userId: string): Promise<Result<UserProfile, NetworkError | JSONStringifyError | JSONParseError>> {
  return gen(async function* () {
    if (userId !== "user_1") {
      return yield * fail<NetworkError>({ tag: "NetworkError", url: `/api/users/${userId}`, status: 404 })
    }
    // a *real* second fallible step inside this one function: serialize,
    // then (pretending it round-tripped through a network call) parse.
    // This is a case where gen() earns its place even inside a single
    // function — two dependent Result-producing steps, not just one branch.
    const stringified = yield * unwrap(tryJSONStringify({ userId: "user_1", name: "Craig" }))
    const raw = await delay(stringified, 200)
    return yield * unwrap(tryJSONParse<UserProfile>(raw))
  })
}
```

Note `fetchUserProfile`'s error type grew to
`NetworkError | JSONStringifyError | JSONParseError` — `gen()` unions the
error types of every `fail()`/`unwrap()` call in the block automatically,
so adding the stringify/parse round-trip widened the return type for free,
no manual bookkeeping.

The final `login` result is `Result<{ user, token }, NetworkError |
JSONStringifyError | JSONParseError>` — identical in shape and
type-safety to what Step 1 produced (just with a wider error union, since
`fetchUserProfile` now has more ways to fail). `gen()` didn't add any new
*capability* over Step 1 — it's Step 1's exact composition, with the
repetitive short-circuit boilerplate written once, inside the library,
instead of once per call site.

## When to reach for `gen()` vs. the plain `Result` helpers

`gen()` is not a universal upgrade over `isErr`/`chain`/`matchResult` — use
whichever fits the shape of the code:

| Situation | Use |
| --- | --- |
| One fallible step, nothing to chain | `safe()` alone, or `matchResult()` to branch on the outcome |
| Two steps, straightforward chain, no branching logic between them | `chain(result, fn)` — one call, no generator syntax |
| Two or more sequential steps, especially where later steps need earlier ones' unwrapped values | `gen()` — this is exactly where the boilerplate `isErr` chain gets painful, and where `gen()` pays for itself |
| You need different handling per error *tag*, not just per ok/err | `match()` on the final tagged error, regardless of which style produced it |

Concretely: `postLogin` → `fetchUserProfile` is two sequential async steps
where the second depends on the first's unwrapped value, and
`fetchUserProfile` itself has two dependent steps internally — `gen()`
earns its place at both levels. The single-endpoint demos elsewhere in
this repo (`runDivide`, `runSlugify`, etc.) only have *one* fallible step —
there's nothing to chain, so they just use `safe()` directly, no `gen()`
in sight. Reaching for `gen()` there would just be a generator wrapped
around code that never had a short-circuiting problem to solve.

**Rule of thumb:** if you're about to write your second `if (isErr(...))
return ...` in the same function, that's the signal to reach for `gen()`
(or `chain()`, if it's exactly two steps with no logic in between) instead.
