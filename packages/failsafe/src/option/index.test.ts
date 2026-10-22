import { describe, expect, it } from "vitest"
import { isNone, isSome, matchOption, none, optionFromNullable, some } from "./index"

describe("some / none", () => {
  it("creates a Some option", () => {
    expect(some(42)).toEqual({ some: true, value: 42 })
  })

  it("none is a stable None value", () => {
    expect(none).toEqual({ some: false })
  })
})

describe("isSome / isNone", () => {
  it("narrows Some options", () => {
    const option = some(1)
    expect(isSome(option)).toBe(true)
    expect(isNone(option)).toBe(false)
  })

  it("narrows None options", () => {
    expect(isSome(none)).toBe(false)
    expect(isNone(none)).toBe(true)
  })
})

describe("matchOption", () => {
  it("calls the some arm for Some", () => {
    expect(matchOption(some(1), { some: v => `got ${v}`, none: () => "nothing" })).toBe("got 1")
  })

  it("calls the none arm for None", () => {
    expect(matchOption<number, string>(none, { some: v => `got ${v}`, none: () => "nothing" })).toBe("nothing")
  })
})

describe("optionFromNullable", () => {
  it("returns None for null", () => {
    expect(optionFromNullable(null)).toEqual({ some: false })
  })

  it("returns None for undefined", () => {
    expect(optionFromNullable(undefined)).toEqual({ some: false })
  })

  it.each([0, "", false])("keeps falsy-but-present value %p as Some", (value) => {
    expect(optionFromNullable(value)).toEqual({ some: true, value })
  })

  it("returns Some for a present value", () => {
    expect(optionFromNullable("hello")).toEqual({ some: true, value: "hello" })
  })
})
