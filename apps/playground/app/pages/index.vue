<script setup lang="ts">
const modules = [
  {
    to: "/safe",
    name: "safe",
    description: "The Result type, Ok/Err, guards, safe(), chain(), and exhaustive matchers.",
    snippet: "safe(() => JSON.parse(raw))",
  },
  {
    to: "/try",
    name: "try",
    description: "Result-returning wrappers around throwing browser/Node APIs.",
    snippet: "tryJSONParse(raw)",
  },
  {
    to: "/pipe",
    name: "pipe",
    description: "Plain left-to-right function composition, independent of Result.",
    snippet: "pipe(input, trim, toLowerCase)",
  },
  {
    to: "/gen",
    name: "gen",
    description: "Generator-based early-return error propagation, like Rust's ? operator.",
    snippet: "yield* unwrap(await fetchUser(id))",
  },
  {
    to: "/eslint",
    name: "eslint-plugin-failsafe",
    pkg: "eslint-plugin-failsafe",
    description: "The no-raw-throwing-call rule — catches raw calls to throwing APIs before they ship.",
    snippet: "JSON.parse(raw) // flagged",
  },
]
</script>

<template>
  <div>
    <section class="py-12 text-center">
      <h1 class="text-4xl font-bold text-gray-50">
        FailSafe
      </h1>
      <p class="mx-auto mt-4 max-w-xl text-gray-400">
        Type-safe error handling utilities for TypeScript. Lightweight,
        dependency-free alternative to neverthrow, plus additional helpers
        for wrapping browser/Node APIs that throw exceptions.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <a
          href="https://www.npmjs.com/package/@crbroughton/failsafe"
          target="_blank"
          rel="noopener"
          class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-white"
        >
          pnpm add @crbroughton/failsafe
        </a>
        <a
          href="https://github.com/CRBroughton/failsafe"
          target="_blank"
          rel="noopener"
          class="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-900"
        >
          View on GitHub
        </a>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="mod in modules"
        :key="mod.to"
        :to="mod.to"
        class="block rounded-lg border border-gray-800 bg-gray-900/40 p-6 transition-colors hover:border-gray-600"
      >
        <h2 class="font-mono text-lg font-semibold text-gray-100">
          {{ mod.pkg ?? `@crbroughton/failsafe${mod.name === "safe" ? "" : `/${mod.name}`}` }}
        </h2>
        <p class="mt-2 text-sm text-gray-400">
          {{ mod.description }}
        </p>
        <code class="mt-4 block truncate text-xs text-gray-600">{{ mod.snippet }}</code>
      </NuxtLink>
    </section>
  </div>
</template>
