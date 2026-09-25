import type { Result, TaggedError } from "../safe"
import { describe, expect, it } from "vitest"
import { Err, Ok } from "../safe"
import { fail, gen, unwrap } from "./index"

describe("gen (sync)", () => {
  it("returns Ok when the generator completes without yielding", () => {
    const result = gen(function* () {
      return 42
    })
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it("returns Err when fail() yields", () => {
    const result = gen(function* () {
      return yield * fail("boom")
    })
    expect(result).toEqual({ ok: false, error: "boom" })
  })

  it("short-circuits on unwrap() of an Err result", () => {
    const result = gen(function* () {
      const value = yield * unwrap(Err("nope") as Result<number, string>)
      return value + 1
    })
    expect(result).toEqual({ ok: false, error: "nope" })
  })

  it("passes through the value on unwrap() of an Ok result", () => {
    const result = gen(function* () {
      const value = yield * unwrap(Ok(10) as Result<number, string>)
      return value + 1
    })
    expect(result).toEqual({ ok: true, value: 11 })
  })

  it("does not return a Promise for a sync generator", () => {
    const result = gen(function* () {
      return "sync"
    })
    expect(result).not.toBeInstanceOf(Promise)
  })
})

describe("gen (async)", () => {
  it("returns a Promise<Ok> when the async generator completes", async () => {
    const promise = gen(async function* () {
      await Promise.resolve()
      return 42
    })
    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).resolves.toEqual({ ok: true, value: 42 })
  })

  it("returns a Promise<Err> when fail() yields inside an async generator", async () => {
    const result = await gen(async function* () {
      await Promise.resolve()
      return yield * fail("async-boom")
    })
    expect(result).toEqual({ ok: false, error: "async-boom" })
  })

  it("short-circuits on unwrap() of an awaited Err result", async () => {
    async function getResult(): Promise<Result<number, string>> {
      return Err("network-down")
    }
    const result = await gen(async function* () {
      const value = yield * unwrap(await getResult())
      return value + 1
    })
    expect(result).toEqual({ ok: false, error: "network-down" })
  })

  it("chains multiple awaited Result-returning calls", async () => {
    async function getA(): Promise<Result<number, string>> {
      return Ok(1)
    }
    async function getB(a: number): Promise<Result<number, string>> {
      return Ok(a + 1)
    }
    const result = await gen(async function* () {
      const a = yield * unwrap(await getA())
      const b = yield * unwrap(await getB(a))
      return a + b
    })
    expect(result).toEqual({ ok: true, value: 3 })
  })
})

describe("fail", () => {
  it("yields the error exactly once", () => {
    const iter = fail("boom")
    const first = iter.next()
    expect(first).toEqual({ done: false, value: "boom" })
  })

  it("throws if resumed after yielding (never happens through gen())", () => {
    const iter = fail("boom")
    iter.next()
    expect(() => iter.next()).toThrow("unreachable")
  })
})

describe("unwrap", () => {
  it("yields the error for an Err result and never returns", () => {
    const iter = unwrap(Err("boom") as Result<number, string>)
    const first = iter.next()
    expect(first).toEqual({ done: false, value: "boom" })
  })

  it("returns the value directly for an Ok result, without yielding", () => {
    const iter = unwrap(Ok(5) as Result<number, string>)
    const first = iter.next()
    expect(first).toEqual({ done: true, value: 5 })
  })

  it("falls through to the underlying value if resumed after yielding an Err (never happens through gen())", () => {
    const iter = unwrap(Err("boom") as Result<number, string>)
    iter.next()
    const second = iter.next()
    expect(second.done).toBe(true)
  })
})

describe("real-world example: tagged error union propagation", () => {
  type ValidationError = TaggedError<"ValidationError", { field: string }>
  type NotFoundError = TaggedError<"NotFoundError", { id: string }>

  function validate(input: string): Result<string, ValidationError> {
    return input.trim() === ""
      ? Err({ tag: "ValidationError", field: "input" })
      : Ok(input.trim())
  }

  function lookup(id: string): Result<{ id: string }, NotFoundError> {
    return id === "missing"
      ? Err({ tag: "NotFoundError", id })
      : Ok({ id })
  }

  function run(id: string): Result<{ id: string }, ValidationError | NotFoundError> {
    return gen(function* () {
      const trimmed = yield * unwrap(validate(id))
      const found = yield * unwrap(lookup(trimmed))
      return found
    })
  }

  it("succeeds when both steps succeed", () => {
    expect(run("user_1")).toEqual({ ok: true, value: { id: "user_1" } })
  })

  it("propagates the first step's tagged error", () => {
    expect(run("   ")).toEqual({
      ok: false,
      error: { tag: "ValidationError", field: "input" },
    })
  })

  it("propagates the second step's tagged error", () => {
    expect(run("missing")).toEqual({
      ok: false,
      error: { tag: "NotFoundError", id: "missing" },
    })
  })
})
