import { describe, expect, it } from "vitest"
import { pipe } from "./index"

describe("pipe", () => {
  it("returns the value unchanged with no functions", () => {
    expect(pipe(5)).toBe(5)
  })

  it("applies a single function", () => {
    expect(pipe(5, n => n + 1)).toBe(6)
  })

  it("applies two functions left to right", () => {
    expect(pipe(5, n => n + 1, n => n * 2)).toBe(12)
  })

  it("applies three functions left to right", () => {
    expect(pipe(5, n => n + 1, n => n * 2, n => n.toString())).toBe("12")
  })

  it("applies four functions left to right", () => {
    const result = pipe(
      5,
      n => n + 1,
      n => n * 2,
      n => n.toString(),
      s => `value: ${s}`,
    )
    expect(result).toBe("value: 12")
  })

  it("applies five functions left to right", () => {
    const result = pipe(
      "  Hello World  ",
      s => s.trim(),
      s => s.toLowerCase(),
      s => s.replace(/\s+/g, "-"),
      s => `#${s}`,
      s => s.length,
    )
    expect(result).toBe(12)
  })
})
