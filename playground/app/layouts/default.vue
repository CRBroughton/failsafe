<script setup lang="ts">
const links = [
  { to: "/safe", label: "safe" },
  { to: "/try", label: "try" },
  { to: "/pipe", label: "pipe" },
  { to: "/gen", label: "gen" },
]
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-200">
    <header class="border-b border-gray-800">
      <nav class="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4">
        <NuxtLink to="/" class="font-bold text-gray-50">
          FailSafe
        </NuxtLink>
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="font-mono text-sm text-gray-400 hover:text-gray-100"
          active-class="text-gray-100"
        >
          {{ link.label }}
        </NuxtLink>
        <a
          href="https://github.com/CRBroughton/failsafe"
          target="_blank"
          rel="noopener"
          class="ml-auto text-sm text-gray-400 hover:text-gray-100"
        >
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/@crbroughton/failsafe"
          target="_blank"
          rel="noopener"
          class="text-sm text-gray-400 hover:text-gray-100"
        >
          npm
        </a>
      </nav>
    </header>
    <main class="mx-auto max-w-4xl px-6 py-10">
      <slot />
    </main>
  </div>
</template>
