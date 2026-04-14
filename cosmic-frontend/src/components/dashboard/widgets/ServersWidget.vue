<template>
  <div class="servers-widget">
    <div v-if="loading">Загрузка контейнеров...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="container-list">
      <div v-for="c in containers" :key="c.id" class="container-item">
        <div class="info">
          <span class="name">{{ c.name }}</span>
          <span :class="['status', c.status]">{{ c.status }}</span>
        </div>
        <div class="actions">
          <button class="btn start" @click="startContainer(c.id)">▶</button>
          <button class="btn stop" @click="stopContainer(c.id)">■</button>
          <button class="btn restart" @click="restartContainer(c.id)">↻</button>
          <button class="btn delete" @click="removeContainer(c.name)">🗑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchContainers } from '../../../services/dockerApi'

const containers = ref([])
const loading = ref(true)
const error = ref(null)

const loadContainers = async () => {
  loading.value = true
  error.value = null
  try {
    containers.value = await fetchContainers()
  } catch (e) {
    error.value = 'Не удалось загрузить контейнеры'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Заглушки для действий (пока без реальных API)
const startContainer = (id) => console.log('start', id)
const stopContainer = (id) => console.log('stop', id)
const restartContainer = (id) => console.log('restart', id)
const removeContainer = (name) => console.log('remove', name)

onMounted(loadContainers)
</script>

<style scoped>
.servers-widget { height: 100%; overflow: auto; padding: 8px; }
.container-list { display: flex; flex-direction: column; gap: 8px; }
.container-item { display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; }
.status { padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; background: #555; }
.status.running { background: var(--green); color: black; }
.status.exited { background: var(--red); }
.actions { display: flex; gap: 4px; }
.btn { background: none; border: 1px solid var(--border); color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn:hover { background: rgba(255,255,255,0.1); }
.btn.start { color: var(--green); }
.btn.stop { color: var(--red); }
.btn.restart { color: var(--cyan); }
.error { color: var(--red); }
</style>