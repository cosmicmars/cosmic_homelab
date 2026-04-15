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
          <button
            class="btn start"
            @click="handleStart(c.id)"
            :disabled="acting === c.id"
            title="Запустить"
          >
            {{ acting === c.id ? '...' : '▶' }}
          </button>
          <button
            class="btn stop"
            @click="handleStop(c.id)"
            :disabled="acting === c.id"
            title="Остановить"
          >
            {{ acting === c.id ? '...' : '■' }}
          </button>
          <button
            class="btn restart"
            @click="handleRestart(c.id)"
            :disabled="acting === c.id"
            title="Перезапустить"
          >
            {{ acting === c.id ? '...' : '↻' }}
          </button>
          <button
            class="btn delete"
            @click="handleRemove(c)"
            :disabled="acting === c.id"
            title="Удалить"
          >
            {{ acting === c.id ? '...' : '🗑' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  fetchContainers,
  startContainer,
  stopContainer,
  removeContainer
} from '../../../services/dockerApi'
import { useToast } from '../../../composables/useToast'

const toast = useToast()
const containers = ref([])
const loading = ref(true)
const error = ref(null)
const acting = ref(null) // id контейнера, над которым выполняется действие

const loadContainers = async () => {
  loading.value = true
  error.value = null
  try {
    containers.value = await fetchContainers()
  } catch (e) {
    error.value = 'Не удалось загрузить контейнеры'
    toast.error(error.value)
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleStart = async (id) => {
  acting.value = id
  try {
    await startContainer(id)
    toast.success('Контейнер запущен')
    await loadContainers()
  } catch (e) {
    toast.error('Ошибка запуска: ' + e.message)
  } finally {
    acting.value = null
  }
}

const handleStop = async (id) => {
  acting.value = id
  try {
    await stopContainer(id)
    toast.success('Контейнер остановлен')
    await loadContainers()
  } catch (e) {
    toast.error('Ошибка остановки: ' + e.message)
  } finally {
    acting.value = null
  }
}

const handleRestart = async (id) => {
  acting.value = id
  try {
    // Перезапуск = остановка + запуск
    await stopContainer(id)
    await startContainer(id)
    toast.success('Контейнер перезапущен')
    await loadContainers()
  } catch (e) {
    toast.error('Ошибка перезапуска: ' + e.message)
  } finally {
    acting.value = null
  }
}

const handleRemove = async (container) => {
  if (!confirm(`Удалить контейнер ${container.name}?`)) return
  acting.value = container.id
  try {
    await removeContainer(container.name)
    toast.success('Контейнер удалён')
    await loadContainers()
  } catch (e) {
    toast.error('Ошибка удаления: ' + e.message)
  } finally {
    acting.value = null
  }
}

onMounted(loadContainers)
</script>

<style scoped>
.servers-widget {
  height: 100%;
  overflow: auto;
  padding: 8px;
}
.container-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.container-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
}
.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  background: #555;
}
.status.running {
  background: var(--green);
  color: black;
}
.status.exited {
  background: var(--red);
}
.actions {
  display: flex;
  gap: 4px;
}
.btn {
  background: none;
  border: 1px solid var(--border);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.start { color: var(--green); }
.btn.stop { color: var(--red); }
.btn.restart { color: var(--cyan); }
.error {
  color: var(--red);
}
</style>