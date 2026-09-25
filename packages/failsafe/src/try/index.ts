import type { Result, TaggedError } from "../safe"
import { safe } from "../safe"

/**
 * Error returned when JSON.parse fails on malformed input.
 */
export type JSONParseError = TaggedError<"JSONParseError", { raw: string }>

/**
 * Error returned when JSON.stringify fails (circular references, BigInt, etc).
 */
export type JSONStringifyError = TaggedError<"JSONStringifyError">

/**
 * Error returned when encodeURIComponent/decodeURIComponent fail on a
 * malformed sequence.
 */
export type URIError_ = TaggedError<"URIError", { input: string }>

/**
 * Error returned when atob/btoa fail on malformed or non-Latin1 input.
 */
export type Base64Error = TaggedError<"Base64Error", { input: string }>

/**
 * Error returned when a localStorage read/write fails — quota exceeded,
 * storage disabled (e.g. Safari private mode), or serialization failure.
 */
export type StorageError = TaggedError<"StorageError", { key: string }>

/**
 * Error returned when `new URL(...)` fails on an invalid URL string.
 */
export type URLParseError = TaggedError<"URLParseError", { input: string }>

/**
 * Error returned when structuredClone fails on a non-cloneable value
 * (functions, DOM nodes, etc).
 */
export type StructuredCloneError = TaggedError<"StructuredCloneError">

/**
 * Safely parses a JSON string. Wraps JSON.parse, which throws a
 * SyntaxError on invalid JSON.
 *
 * @template T The expected shape of the parsed value
 * @param raw The JSON string to parse
 * @param reviver Optional JSON.parse reviver, called for each member of the object
 * @returns Ok(parsed value) or Err(JSONParseError)
 *
 * @example
 * ```ts
 * const result = tryJSONParse<User>(raw)
 * if (isOk(result)) {
 *   console.log(result.value.name)
 * }
 * ```
 */
export function tryJSONParse<T = unknown>(
  raw: string,
  reviver?: (this: unknown, key: string, value: unknown) => unknown,
): Result<T, JSONParseError> {
  return safe(
    () => JSON.parse(raw, reviver) as T,
    (): JSONParseError => ({ tag: "JSONParseError", raw }),
  )
}

/**
 * Safely stringifies a value to JSON. Wraps JSON.stringify, which throws
 * a TypeError on circular references or BigInt values.
 *
 * @param value The value to stringify
 * @param replacer Optional JSON.stringify replacer — a transform function, or an allowlist of keys to include
 * @param space Optional JSON.stringify indentation
 * @returns Ok(json string) or Err(JSONStringifyError)
 *
 * @example
 * ```ts
 * const result = tryJSONStringify(data)
 * if (isErr(result)) {
 *   console.error('could not serialize:', result.error)
 * }
 * ```
 */
export function tryJSONStringify(
  value: unknown,
  replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (string | number)[] | null,
  space?: string | number,
): Result<string, JSONStringifyError> {
  return safe(
    () => JSON.stringify(value, replacer as (string | number)[] | null, space),
    (): JSONStringifyError => ({ tag: "JSONStringifyError" }),
  )
}

/**
 * Safely decodes a URI component. Wraps decodeURIComponent, which throws
 * a URIError on malformed percent-encoded sequences.
 *
 * @param input The string to decode
 * @returns Ok(decoded string) or Err(URIError_)
 */
export function tryURIDecode(input: string): Result<string, URIError_> {
  return safe(
    () => decodeURIComponent(input),
    (): URIError_ => ({ tag: "URIError", input }),
  )
}

/**
 * Safely encodes a URI component. Wraps encodeURIComponent, which throws
 * a URIError on lone surrogate characters.
 *
 * @param input The string, number, or boolean to encode
 * @returns Ok(encoded string) or Err(URIError_)
 */
export function tryURIEncode(input: string | number | boolean): Result<string, URIError_> {
  return safe(
    () => encodeURIComponent(input),
    (): URIError_ => ({ tag: "URIError", input: String(input) }),
  )
}

/**
 * Safely decodes a base64 string. Wraps atob, which throws a DOMException
 * on malformed base64 or non-Latin1 input.
 *
 * @param input The base64 string to decode
 * @returns Ok(decoded string) or Err(Base64Error)
 */
export function tryBase64Decode(input: string): Result<string, Base64Error> {
  return safe(
    () => atob(input),
    (): Base64Error => ({ tag: "Base64Error", input }),
  )
}

/**
 * Safely encodes a string to base64. Wraps btoa, which throws a
 * DOMException on characters outside the Latin1 range.
 *
 * @param input The string to encode
 * @returns Ok(base64 string) or Err(Base64Error)
 */
export function tryBase64Encode(input: string): Result<string, Base64Error> {
  return safe(
    () => btoa(input),
    (): Base64Error => ({ tag: "Base64Error", input }),
  )
}

/**
 * Safely reads a value from localStorage. localStorage.getItem doesn't
 * throw on its own, but this exists so a get→parse pipeline stays
 * consistently Result-shaped throughout (pair with tryJSONParse via chain).
 *
 * @param key The storage key to read
 * @returns Ok(value or null) or Err(StorageError)
 *
 * @example
 * ```ts
 * const result = chain(tryLocalStorageGet('user'), (raw) =>
 *   raw === null ? Err({ tag: 'JSONParseError', raw: '' }) : tryJSONParse<User>(raw))
 * ```
 */
export function tryLocalStorageGet(key: string): Result<string | null, StorageError> {
  return safe(
    () => localStorage.getItem(key),
    (): StorageError => ({ tag: "StorageError", key }),
  )
}

/**
 * Safely writes a value to localStorage. Wraps localStorage.setItem, which
 * throws on quota exceeded or when storage is disabled (e.g. Safari
 * private mode).
 *
 * @param key The storage key to write
 * @param value The string value to store
 * @returns Ok(undefined) or Err(StorageError)
 */
export function tryLocalStorageSet(key: string, value: string): Result<void, StorageError> {
  return safe(
    () => localStorage.setItem(key, value),
    (): StorageError => ({ tag: "StorageError", key }),
  )
}

/**
 * Safely constructs a URL. Wraps `new URL(...)`, which throws a TypeError
 * on an invalid URL string.
 *
 * @param input The URL (string or URL) to parse
 * @param base Optional base URL (string or URL) to resolve against
 * @returns Ok(URL) or Err(URLParseError)
 *
 * @example
 * ```ts
 * const result = tryURL(userSuppliedString)
 * if (isOk(result)) {
 *   console.log(result.value.hostname)
 * }
 * ```
 */
export function tryURL(input: string | URL, base?: string | URL): Result<URL, URLParseError> {
  return safe(
    () => new URL(input, base),
    (): URLParseError => ({ tag: "URLParseError", input: String(input) }),
  )
}

/**
 * Safely deep-clones a value. Wraps structuredClone, which throws a
 * DataCloneError on non-cloneable values (functions, DOM nodes, etc).
 *
 * @template T The type of the value to clone
 * @param value The value to clone
 * @param options Optional structuredClone options (e.g. a transfer list)
 * @returns Ok(cloned value) or Err(StructuredCloneError)
 */
export function tryStructuredClone<T>(
  value: T,
  options?: StructuredSerializeOptions,
): Result<T, StructuredCloneError> {
  return safe(
    () => structuredClone(value, options),
    (): StructuredCloneError => ({ tag: "StructuredCloneError" }),
  )
}
