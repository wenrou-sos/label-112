<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  title: string
  value: string | number
  icon: Component
  trend?: string
  trendUp?: boolean
  gradientFrom: string
  gradientTo: string
  iconBg: string
}

defineProps<Props>()
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-card hover:shadow-card-hover transition-all duration-300 p-5 group">
    <div
      class="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"
      :class="[`bg-gradient-to-br ${gradientFrom} ${gradientTo}`]"
    ></div>

    <div class="relative flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{{ title }}</p>
        <p class="text-3xl font-bold font-mono text-gray-900 dark:text-white tracking-tight">
          {{ value }}
        </p>
        <p v-if="trend" class="mt-2 flex items-center gap-1 text-xs">
          <span :class="trendUp ? 'text-eco-600' : 'text-danger-500'">
            {{ trendUp ? '↑' : '↓' }}
          </span>
          <span class="text-gray-500 dark:text-gray-400">{{ trend }}</span>
        </p>
      </div>
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        :class="iconBg"
      >
        <component :is="icon" class="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
</template>
