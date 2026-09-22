<script setup lang="ts">
defineProps<{
  result: unknown
  loading?: boolean
}>()

function isResultShaped(value: unknown): value is { ok: boolean } {
  return typeof value === "object" && value !== null && "ok" in value
}
</script>

<template>
  <div
    class="mt-4 min-h-16 rounded-md border p-4 font-mono text-sm transition-colors"
    :class="[
      loading
        ? 'border-gray-800 text-gray-500'
        : result === null || result === undefined
          ? 'border-gray-800 text-gray-600'
          : isResultShaped(result) && result.ok
            ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
            : 'border-rose-800 bg-rose-950/30 text-rose-300',
    ]"
  >
    <template v-if="loading">
      running…
    </template>
    <template v-else-if="result === null || result === undefined">
      run the demo to see a result
    </template>
    <pre v-else class="whitespace-pre-wrap break-words">{{ JSON.stringify(result, null, 2) }}</pre>
  </div>
</template>
