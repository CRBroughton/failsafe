import { Err, Ok } from "@crbroughton/failsafe"
import { describe, expect, it } from "vitest"
import "./index"

describe("toBeOk", () => {
  it("passes for an Ok result", () => {
    expect(Ok(42)).toBeOk()
  })

  it("passes when the value matches", () => {
    expect(Ok(42)).toBeOk(42)
  })

  it("fails for an Err result", () => {
    expect(() => expect(Err({ tag: "Boom" })).toBeOk()).toThrowError(/expected Ok, but received Err/)
  })

  it("fails when the value doesn't match", () => {
    expect(() => expect(Ok(42)).toBeOk(43)).toThrowError(/expected Ok/)
  })

  it("fails for a non-Result value", () => {
    expect(() => expect("not a result").toBeOk()).toThrowError(/expected a Result/)
  })

  it("composes with .not", () => {
    expect(Err({ tag: "Boom" })).not.toBeOk()
  })
})

describe("toBeErr", () => {
  it("passes for an Err result", () => {
    expect(Err({ tag: "Boom" })).toBeErr()
  })

  it("passes when the tag matches", () => {
    expect(Err({ tag: "ParseError", raw: "{}" })).toBeErr("ParseError")
  })

  it("fails for an Ok result", () => {
    expect(() => expect(Ok(42)).toBeErr()).toThrowError(/expected Err, but received Ok/)
  })

  it("fails when the tag doesn't match", () => {
    expect(() => expect(Err({ tag: "ParseError" })).toBeErr("StorageError")).toThrowError(/expected Err with tag/)
  })

  it("only checks the tag, not the rest of the error's shape", () => {
    expect(Err({ tag: "ParseError", raw: "irrelevant for this check" })).toBeErr("ParseError")
  })

  it("fails for a non-Result value", () => {
    expect(() => expect(null).toBeErr()).toThrowError(/expected a Result/)
  })

  it("composes with .not", () => {
    expect(Ok(42)).not.toBeErr()
  })
})
