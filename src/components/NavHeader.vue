<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Leaf, Bell, User, Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
const currentTime = ref('')
let timer: number | null = null

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between shadow-sm z-20">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-eco-400 to-eco-600 flex items-center justify-center shadow-md">
        <Leaf class="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">绿收调度中心</h1>
        <p class="text-xs text-gray-500 dark:text-gray-400">Waste Recycling Dispatch Center</p>
      </div>
    </div>

    <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span class="text-sm font-mono text-gray-700 dark:text-gray-200">{{ currentTime }}</span>
    </div>

    <div class="flex items-center gap-3">
      <button
        @click="toggleTheme"
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Sun v-if="isDark" class="w-5 h-5" />
        <Moon v-else class="w-5 h-5" />
      </button>
      <button class="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <Bell class="w-5 h-5" />
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full animate-pulse-fast"></span>
      </button>
      <div class="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-eco-300 to-eco-500 flex items-center justify-center">
          <User class="w-4 h-4 text-white" />
        </div>
        <div class="hidden sm:block">
          <p class="text-sm font-medium text-gray-900 dark:text-white">调度管理员</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">在线</p>
        </div>
      </div>
    </div>
  </header>
</template>
