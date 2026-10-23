import type { Result } from "./index"
import { describe, expect, it } from "vitest"
import { andThen, chain, collect, Err, err, fromNullable, isErr, isOk, mapErr, match, matchResult, Ok, ok, partition, safe, unwrapOr, unwrapOrElse } from "./index"

describe("ok / Err", () => {
  it("creates a successful result", () => {
    expect(Ok(42)).toEqual({ ok: true, value: 42 })
  })

  it("creates a failed result", () => {
    expect(Err("boom")).toEqual({ ok: false, error: "boom" })
  })
})

describe("isOk / isErr", () => {
  it("narrows Ok results", () => {
    const result = Ok(1)
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
  })

  it("narrows Err results", () => {
    const result = Err("boom")
    expect(isOk(result)).toBe(false)
    expect(isErr(result)).toBe(true)
  })
})

describe("ok / err", () => {
  it("extracts the value from Ok as Some, None from Err", () => {
    expect(ok(Ok(1))).toEqual({ some: true, value: 1 })
    expect(ok(Err("boom"))).toEqual({ some: false })
  })

  it("extracts the error from Err as Some, None from Ok", () => {
    expect(err(Err("boom"))).toEqual({ some: true, value: "boom" })
    expect(err(Ok(1))).toEqual({ some: false })
  })

  it("distinguishes Ok(null) from Err — both were indistinguishable as raw nullable returns", () => {
    expect(ok(Ok(null))).toEqual({ some: true, value: null })
    expect(ok(Err("boom"))).toEqual({ some: false })
  })
})

describe("chain", () => {
  it("chains through an Ok result", () => {
    const result = chain(Ok(1), value => Ok(value + 1))
    expect(result).toEqual({ ok: true, value: 2 })
  })

  it("short-circuits on an Err result", () => {
    const original = Err("boom")
    const result = chain(original, () => Ok(1))
    expect(result).toBe(original)
  })
})

describe("collect", () => {
  it("collects every value when all are Ok (tuple form)", () => {
    const result = collect([Ok("a"), Ok(1), Ok(true)])
    expect(result).toEqual({ ok: true, value: ["a", 1, true] })
  })

  it("collects every error when any are Err, not just the first", () => {
    const result = collect([
      Err({ tag: "A" as const }),
      Ok(1),
      Err({ tag: "B" as const }),
    ])
    expect(result).toEqual({
      ok: false,
      error: [{ tag: "A" }, { tag: "B" }],
    })
  })

  it("returns Ok([]) for an empty array", () => {
    const result = collect([])
    expect(result).toEqual({ ok: true, value: [] })
  })

  it("works with a homogeneous array built at runtime", () => {
    interface NaNError { tag: "NaNError", raw: string }
    const inputs = ["1", "2", "not-a-number", "4"]
    const results: Result<number, NaNError>[] = inputs.map((raw) => {
      const parsed = Number(raw)
      return Number.isNaN(parsed) ? Err({ tag: "NaNError", raw }) : Ok(parsed)
    })
    const result = collect(results)
    expect(result).toEqual({ ok: false, error: [{ tag: "NaNError", raw: "not-a-number" }] })
  })
})

describe("partition", () => {
  it("splits a mixed batch into both buckets, never failing itself", () => {
    const results = [Ok(1), Err("bad-1"), Ok(2), Err("bad-2"), Ok(3)]
    const { oks, errs } = partition(results)
    expect(oks).toEqual([1, 2, 3])
    expect(errs).toEqual(["bad-1", "bad-2"])
  })

  it("returns all oks and no errs when everything succeeds", () => {
    const { oks, errs } = partition([Ok(1), Ok(2)])
    expect(oks).toEqual([1, 2])
    expect(errs).toEqual([])
  })

  it("returns all errs and no oks when everything fails", () => {
    const { oks, errs } = partition([Err("a"), Err("b")])
    expect(oks).toEqual([])
    expect(errs).toEqual(["a", "b"])
  })

  it("returns two empty buckets for an empty array", () => {
    const { oks, errs } = partition([])
    expect(oks).toEqual([])
    expect(errs).toEqual([])
  })
})

describe("safe", () => {
  it("wraps a sync function's return value in Ok", () => {
    const result = safe(() => 42)
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it("wraps a sync function's thrown error in Err", () => {
    const result = safe(() => {
      throw new Error("boom")
    })
    expect(isErr(result)).toBe(true)
    expect((result as { error: Error }).error.message).toBe("boom")
  })

  it("maps a sync thrown error with mapError", () => {
    const result = safe(
      () => {
        throw new Error("boom")
      },
      () => ({ tag: "Failed" as const }),
    )
    expect(result).toEqual({ ok: false, error: { tag: "Failed" } })
  })

  it("wraps a resolved promise in Ok", async () => {
    const result = await safe(Promise.resolve(42))
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it("wraps a rejected promise in Err", async () => {
    const result = await safe(Promise.reject(new Error("boom")))
    expect(isErr(result)).toBe(true)
    expect((result as { error: Error }).error.message).toBe("boom")
  })

  it("maps a rejected promise's error with mapError", async () => {
    const result = await safe(
      Promise.reject(new Error("boom")),
      () => ({ tag: "Failed" as const }),
    )
    expect(result).toEqual({ ok: false, error: { tag: "Failed" } })
  })
})

describe("matchResult", () => {
  it("calls the ok handler for Ok", () => {
    const message = matchResult(Ok(1), {
      ok: value => `got ${value}`,
      err: () => "unreachable",
    })
    expect(message).toBe("got 1")
  })

  it("calls the err handler for Err", () => {
    const message = matchResult(Err("boom"), {
      ok: () => "unreachable",
      err: error => `failed: ${error}`,
    })
    expect(message).toBe("failed: boom")
  })
})

describe("match", () => {
  type TestError =
    | { tag: "ParseError", raw: string }
    | { tag: "StorageError", key: string }

  // returning through a function call (rather than a local literal-initialized
  // const) keeps TestError as the full union instead of TypeScript narrowing
  // it down to whichever single tag the literal happens to use
  function makeError(): TestError {
    return { tag: "ParseError", raw: "abc" }
  }

  it("dispatches to the matching tag handler", () => {
    const parseError = makeError()
    const message = match(parseError, {
      ParseError: (e: Extract<TestError, { tag: "ParseError" }>) => `bad json: ${e.raw}`,
      StorageError: (e: Extract<TestError, { tag: "StorageError" }>) => `storage failed: ${e.key}`,
    })
    expect(message).toBe("bad json: abc")
  })
})

describe("fromNullable", () => {
  it("returns Ok for a present value", () => {
    expect(fromNullable("hi", () => "missing")).toEqual({ ok: true, value: "hi" })
  })

  it("returns Err(onNull()) for null", () => {
    expect(fromNullable(null, () => "missing")).toEqual({ ok: false, error: "missing" })
  })

  it("returns Err(onNull()) for undefined", () => {
    expect(fromNullable(undefined, () => "missing")).toEqual({ ok: false, error: "missing" })
  })
})

describe("unwrapOr / unwrapOrElse", () => {
  it("unwrapOr returns the value for Ok", () => {
    expect(unwrapOr(Ok(1), 0)).toBe(1)
  })

  it("unwrapOr returns the fallback for Err", () => {
    expect(unwrapOr(Err("boom"), 0)).toBe(0)
  })

  it("unwrapOrElse returns the value for Ok", () => {
    expect(unwrapOrElse(Ok(1), () => 0)).toBe(1)
  })

  it("unwrapOrElse computes the fallback from the error for Err", () => {
    expect(unwrapOrElse(Err("boom"), error => error.length)).toBe(4)
  })

  it("unwrapOr curried returns the value for Ok", () => {
    expect(unwrapOr(0)(Ok(1))).toBe(1)
  })

  it("unwrapOr curried returns the fallback for Err", () => {
    expect(unwrapOr(0)(Err("boom"))).toBe(0)
  })
})

describe("andThen", () => {
  it("chains through an Ok result", () => {
    const result = andThen((value: number) => Ok(value + 1))(Ok(1))
    expect(result).toEqual({ ok: true, value: 2 })
  })

  it("short-circuits on an Err result", () => {
    const original = Err("boom")
    const result = andThen(() => Ok(1))(original)
    expect(result).toBe(original)
  })
})

describe("mapErr", () => {
  it("leaves an Ok result untouched", () => {
    const original = Ok(1)
    const result = mapErr((e: string) => e.length)(original)
    expect(result).toBe(original)
  })

  it("transforms the error on an Err result", () => {
    const result = mapErr((e: string) => e.length)(Err("boom"))
    expect(result).toEqual({ ok: false, error: 4 })
  })
})
