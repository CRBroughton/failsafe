<script setup lang="ts">
defineProps<{
  title: string
  wraps?: string
}>()
</script>

<template>
  <div class="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
    <div class="mb-1 flex items-baseline justify-between gap-4">
      <h3 class="text-lg font-semibold text-gray-100">
        {{ title }}
      </h3>
      <code v-if="wraps" class="text-xs text-gray-500">{{ wraps }}</code>
    </div>
    <slot />
  </div>
</template>
