import { afterEach, describe, expect, it, vi } from "vitest"
import { isErr, isOk } from "../safe"
import {
  tryBase64Decode,
  tryBase64Encode,
  tryJSONParse,
  tryJSONStringify,
  tryLocalStorageGet,
  tryLocalStorageSet,
  tryStructuredClone,
  tryURIDecode,
  tryURIEncode,
  tryURL,
} from "./index"

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("tryJSONParse", () => {
  it("parses valid JSON", () => {
    const result = tryJSONParse<{ name: string }>("{\"name\":\"ada\"}")
    expect(result).toEqual({ ok: true, value: { name: "ada" } })
  })

  it("returns a JSONParseError for invalid JSON", () => {
    const result = tryJSONParse("not json")
    expect(result).toEqual({ ok: false, error: { tag: "JSONParseError", raw: "not json" } })
  })

  it("applies a reviver function", () => {
    const result = tryJSONParse<{ n: number }>(
      "{\"n\":1}",
      (key, value) => (key === "n" ? (value as number) * 2 : value),
    )
    expect(result).toEqual({ ok: true, value: { n: 2 } })
  })
})

describe("tryJSONStringify", () => {
  it("stringifies a value", () => {
    const result = tryJSONStringify({ a: 1 })
    expect(result).toEqual({ ok: true, value: "{\"a\":1}" })
  })

  it("returns a JSONStringifyError for circular references", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const result = tryJSONStringify(circular)
    expect(result).toEqual({ ok: false, error: { tag: "JSONStringifyError" } })
  })

  it("applies a replacer function", () => {
    const result = tryJSONStringify({ a: 1, b: 2 }, (key, value) => (key === "b" ? undefined : value))
    expect(result).toEqual({ ok: true, value: "{\"a\":1}" })
  })

  it("applies a replacer allowlist array", () => {
    const result = tryJSONStringify({ a: 1, b: 2 }, ["a"])
    expect(result).toEqual({ ok: true, value: "{\"a\":1}" })
  })

  it("applies indentation via space", () => {
    const result = tryJSONStringify({ a: 1 }, null, 2)
    expect(result).toEqual({ ok: true, value: "{\n  \"a\": 1\n}" })
  })
})

describe("tryURIDecode / tryURIEncode", () => {
  it("decodes a valid URI component", () => {
    expect(tryURIDecode("hello%20world")).toEqual({ ok: true, value: "hello world" })
  })

  it("returns a URIError for a malformed sequence", () => {
    const result = tryURIDecode("%")
    expect(result).toEqual({ ok: false, error: { tag: "URIError", input: "%" } })
  })

  it("encodes a valid string", () => {
    expect(tryURIEncode("hello world")).toEqual({ ok: true, value: "hello%20world" })
  })

  it("returns a URIError for a lone surrogate", () => {
    const loneSurrogate = String.fromCharCode(0xD800)
    const result = tryURIEncode(loneSurrogate)
    expect(isErr(result)).toBe(true)
  })

  it("encodes a number", () => {
    expect(tryURIEncode(42)).toEqual({ ok: true, value: "42" })
  })

  it("encodes a boolean", () => {
    expect(tryURIEncode(true)).toEqual({ ok: true, value: "true" })
  })
})

describe("tryBase64Decode / tryBase64Encode", () => {
  it("decodes a valid base64 string", () => {
    expect(tryBase64Decode("aGVsbG8=")).toEqual({ ok: true, value: "hello" })
  })

  it("returns a Base64Error for invalid base64", () => {
    const result = tryBase64Decode("not-valid-base64!!!")
    expect(result).toEqual({
      ok: false,
      error: { tag: "Base64Error", input: "not-valid-base64!!!" },
    })
  })

  it("encodes a valid string", () => {
    expect(tryBase64Encode("hello")).toEqual({ ok: true, value: "aGVsbG8=" })
  })

  it("returns a Base64Error for characters outside Latin1", () => {
    const result = tryBase64Encode("😀")
    expect(isErr(result)).toBe(true)
  })
})

describe("tryLocalStorageGet / tryLocalStorageSet", () => {
  it("writes and reads a value", () => {
    expect(tryLocalStorageSet("key", "value")).toEqual({ ok: true, value: undefined })
    expect(tryLocalStorageGet("key")).toEqual({ ok: true, value: "value" })
  })

  it("returns Ok(null) for a missing key", () => {
    expect(tryLocalStorageGet("missing")).toEqual({ ok: true, value: null })
  })

  it("returns a StorageError when setItem throws", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })
    const result = tryLocalStorageSet("key", "value")
    expect(result).toEqual({ ok: false, error: { tag: "StorageError", key: "key" } })
  })

  it("returns a StorageError when getItem throws", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("access denied")
    })
    const result = tryLocalStorageGet("key")
    expect(result).toEqual({ ok: false, error: { tag: "StorageError", key: "key" } })
  })
})

describe("tryURL", () => {
  it("parses a valid URL", () => {
    const result = tryURL("https://example.com")
    expect(isOk(result)).toBe(true)
  })

  it("returns a URLParseError for an invalid URL", () => {
    const result = tryURL("not a url")
    expect(result).toEqual({ ok: false, error: { tag: "URLParseError", input: "not a url" } })
  })

  it("accepts a URL instance as the base", () => {
    const base = new URL("https://example.com")
    const result = tryURL("/path", base)
    expect(result).toEqual({ ok: true, value: new URL("https://example.com/path") })
  })

  it("accepts a URL instance as the input", () => {
    const input = new URL("https://example.com/path")
    const result = tryURL(input)
    expect(result).toEqual({ ok: true, value: input })
  })
})

describe("tryStructuredClone", () => {
  it("clones a cloneable value", () => {
    const value = { a: 1, b: [1, 2, 3] }
    const result = tryStructuredClone(value)
    expect(result).toEqual({ ok: true, value })
  })

  it("returns a StructuredCloneError for a non-cloneable value", () => {
    const result = tryStructuredClone(() => {})
    expect(result).toEqual({ ok: false, error: { tag: "StructuredCloneError" } })
  })

  it("accepts a transfer list via options", () => {
    const buffer = new ArrayBuffer(8)
    const result = tryStructuredClone(buffer, { transfer: [buffer] })
    expect(isOk(result)).toBe(true)
    expect(buffer.byteLength).toBe(0)
  })
})
