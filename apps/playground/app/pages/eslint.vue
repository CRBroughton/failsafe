<script setup lang="ts">
import { safe } from "@crbroughton/failsafe"
import { tryJSONParse } from "@crbroughton/failsafe/try"

// ⚠️ Intentional lint violation, left unguarded on purpose. Run
// `pnpm lint` and this line is flagged by failsafe/no-raw-throwing-call
// — that's the point of this demo, not a bug to fix.
function parseUserUnsafe(raw: string): unknown {
  return JSON.parse(raw)
}

function parseUserSafe(raw: string) {
  return safe(() => JSON.parse(raw))
}

const input = ref("{\"name\":\"ada\"}")

const unsafeOutcome = ref<{ ok: true, value: unknown } | { ok: false, error: string } | null>(null)
function runUnsafe() {
  try {
    unsafeOutcome.value = { ok: true, value: parseUserUnsafe(input.value) }
  }
  catch (e) {
    // Only reachable because this demo caught it by hand — nothing
    // about JSON.parse itself made that safe.
    unsafeOutcome.value = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const safeOutcome = ref<{ ok: true, value: unknown } | { ok: false, error: string } | null>(null)
function runSafe() {
  const result = parseUserSafe(input.value)
  safeOutcome.value = result.ok
    ? { ok: true, value: result.value }
    : { ok: false, error: result.error instanceof Error ? result.error.message : String(result.error) }
}

const tryHelperOutcome = ref<{ ok: true, value: unknown } | { ok: false, error: string } | null>(null)
function runTryHelper() {
  const result = tryJSONParse(input.value)
  tryHelperOutcome.value = result.ok
    ? { ok: true, value: result.value }
    : { ok: false, error: result.error.raw }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-50">
      eslint-plugin-failsafe
    </h1>
    <p class="mt-2 text-gray-400">
      The <code>no-raw-throwing-call</code> rule flags direct calls to
      native APIs already wrapped by
      <code>@crbroughton/failsafe/try</code>. This page's own
      <code>&lt;script setup&gt;</code> contains a real, unguarded
      <code>JSON.parse</code> call — run <code>pnpm lint</code> against
      this repo and <code>failsafe/no-raw-throwing-call</code> genuinely
      fires on it, right next to the fixed versions below.
    </p>

    <div class="mt-8 grid gap-4">
      <DemoCard title="Unguarded — flagged by the rule" wraps="JSON.parse(raw)">
        <p class="mb-3 text-sm text-gray-400">
          Try malformed JSON to see it actually throw. The only reason
          this doesn't crash the page is a <code>try/catch</code> around
          the button handler — <code>parseUserUnsafe()</code> itself does
          nothing to protect the call, which is exactly what the rule
          objects to.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="input"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            @click="runUnsafe"
          >
            Run
          </button>
        </div>
        <p v-if="unsafeOutcome?.ok" class="mt-3 font-mono text-sm text-green-400">
          {{ JSON.stringify(unsafeOutcome.value) }}
        </p>
        <p v-else-if="unsafeOutcome" class="mt-3 font-mono text-sm text-red-400">
          threw: {{ unsafeOutcome.error }}
        </p>
      </DemoCard>

      <DemoCard title="Wrapped in safe()" wraps="safe(() => JSON.parse(raw))">
        <p class="mb-3 text-sm text-gray-400">
          Same malformed input, but the throw becomes an
          <code>Err</code> instead of an exception.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="input"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            @click="runSafe"
          >
            Run
          </button>
        </div>
        <p v-if="safeOutcome?.ok" class="mt-3 font-mono text-sm text-green-400">
          {{ JSON.stringify(safeOutcome.value) }}
        </p>
        <p v-else-if="safeOutcome" class="mt-3 font-mono text-sm text-red-400">
          Err: {{ safeOutcome.error }}
        </p>
      </DemoCard>

      <DemoCard title="Using the matching tryX() helper" wraps="tryJSONParse(raw)">
        <p class="mb-3 text-sm text-gray-400">
          The other way to satisfy the rule — never call
          <code>JSON.parse</code> directly at all.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="input"
            type="text"
            class="min-w-64 flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-sm text-gray-100"
          >
          <button
            class="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
            @click="runTryHelper"
          >
            Run
          </button>
        </div>
        <p v-if="tryHelperOutcome?.ok" class="mt-3 font-mono text-sm text-green-400">
          {{ JSON.stringify(tryHelperOutcome.value) }}
        </p>
        <p v-else-if="tryHelperOutcome" class="mt-3 font-mono text-sm text-red-400">
          JSONParseError, raw: {{ tryHelperOutcome.error }}
        </p>
      </DemoCard>
    </div>

    <p class="mt-8 text-sm text-gray-500">
      See the
      <a
        href="https://github.com/CRBroughton/failsafe/blob/master/eslint-plugin-failsafe/docs/rules/no-raw-throwing-call.md"
        target="_blank"
        rel="noopener"
        class="text-gray-300 underline hover:text-gray-100"
      >full rule docs</a>
      for the complete pattern table, footguns it also catches, and known
      limitations.
    </p>
  </div>
</template>
