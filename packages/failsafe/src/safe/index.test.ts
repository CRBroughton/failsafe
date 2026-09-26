import type { Result } from "./index"
import { describe, expect, it } from "vitest"
import { chain, collect, Err, err, isErr, isOk, match, matchResult, Ok, ok, safe } from "./index"

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
  it("extracts the value from Ok, null from Err", () => {
    expect(ok(Ok(1))).toBe(1)
    expect(ok(Err("boom"))).toBeNull()
  })

  it("extracts the error from Err, null from Ok", () => {
    expect(err(Err("boom"))).toBe("boom")
    expect(err(Ok(1))).toBeNull()
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

  it("dispatches to the matching tag handler", () => {
    const parseError: TestError = { tag: "ParseError", raw: "abc" }
    const message = match(parseError, {
      ParseError: (e: Extract<TestError, { tag: "ParseError" }>) => `bad json: ${e.raw}`,
      StorageError: (e: Extract<TestError, { tag: "StorageError" }>) => `storage failed: ${e.key}`,
    })
    expect(message).toBe("bad json: abc")
  })
})
