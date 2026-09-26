# @crbroughton/failsafe-vitest

Custom [vitest](https://vitest.dev) matchers for
[`@crbroughton/failsafe`](https://www.npmjs.com/package/@crbroughton/failsafe)'s
`Result` type.

## Install

```sh
pnpm add -D @crbroughton/failsafe-vitest
```

Requires `@crbroughton/failsafe` and `vitest` as peer dependencies (bring
your own versions — this package doesn't pin them for you).

## Usage

Import it once, typically from a vitest `setupFiles` entry:

```ts
// vitest.setup.ts
import "@crbroughton/failsafe-vitest"
```

```ts
// vitest.config.ts
export default defineConfig({
  test: { setupFiles: ["./vitest.setup.ts"] },
})
```

Then use the matchers directly:

```ts
expect(result).toBeOk()
expect(result).toBeOk(42) // also deep-equal checks .value

expect(result).toBeErr()
expect(result).toBeErr("ParseError") // checks .error.tag only, not the full shape
```

Both compose with `.not`:

```ts
expect(result).not.toBeOk()
expect(result).not.toBeErr()
```

## Why tag-only for `toBeErr()`?

Tests usually care *which* error occurred more than its exact payload —
checking only `.error.tag` keeps assertions focused on that, without
tests breaking every time an unrelated field is added to an error's
shape.

## License

MIT
