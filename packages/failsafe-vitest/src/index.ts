import type { Result } from "@crbroughton/failsafe"
import type { MatcherState } from "@vitest/expect"
import { isErr, isOk } from "@crbroughton/failsafe"
import { expect } from "vitest"

interface CustomMatchers<R = unknown> {
  /**
   * Passes if `received` is `Ok`. Pass a value to also require
   * `received.value` deep-equals it.
   */
  toBeOk: (expectedValue?: unknown) => R
  /**
   * Passes if `received` is `Err`. Pass a tag to also require
   * `received.error.tag` matches it — this checks the tag only, not the
   * error's full shape.
   */
  toBeErr: (expectedTag?: string) => R
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

function isResult(value: unknown): value is Result<unknown, unknown> {
  return typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean"
}

interface MatcherResult {
  pass: boolean
  message: () => string
}

function toBeOk(this: MatcherState, received: unknown, expectedValue?: unknown): MatcherResult {
  const hasExpectedValue = arguments.length > 1

  if (!isResult(received)) {
    return {
      pass: false,
      message: () => `expected a Result (an object with a boolean "ok" property), but received ${this.utils.printReceived(received)}`,
    }
  }

  if (!isOk(received)) {
    return {
      pass: false,
      message: () => `expected Ok, but received Err(${this.utils.printReceived(received.error)})`,
    }
  }

  if (hasExpectedValue && !this.equals(received.value, expectedValue)) {
    return {
      pass: false,
      message: () => `expected Ok(${this.utils.printExpected(expectedValue)}) but received Ok(${this.utils.printReceived(received.value)})`,
    }
  }

  return {
    pass: true,
    message: () => `expected not to be Ok, but received Ok(${this.utils.printReceived(received.value)})`,
  }
}

function toBeErr(this: MatcherState, received: unknown, expectedTag?: string): MatcherResult {
  if (!isResult(received)) {
    return {
      pass: false,
      message: () => `expected a Result (an object with a boolean "ok" property), but received ${this.utils.printReceived(received)}`,
    }
  }

  if (!isErr(received)) {
    return {
      pass: false,
      message: () => `expected Err, but received Ok(${this.utils.printReceived(received.value)})`,
    }
  }

  const actualTag = (received.error as { tag?: unknown })?.tag

  if (expectedTag !== undefined && actualTag !== expectedTag) {
    return {
      pass: false,
      message: () => `expected Err with tag ${this.utils.printExpected(expectedTag)} but received Err with tag ${this.utils.printReceived(actualTag)}`,
    }
  }

  return {
    pass: true,
    message: () => `expected not to be Err, but received Err(${this.utils.printReceived(received.error)})`,
  }
}

expect.extend({ toBeOk, toBeErr })
