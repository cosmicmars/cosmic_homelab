<template>
  <div class="logs-view">
    <div class="logs-header">
      <h2>Логи контейнера</h2>
      <div class="header-actions">
        <select v-model="selectedContainerId" class="container-select">
          <option v-for="c in containers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="action-btn" @click="connectLogs" :disabled="!selectedContainerId || connected">
          <span v-if="connecting"></span>
          <span v-else>▶ Подключиться</span>
        </button>
        <button class="action-btn" @click="disconnectLogs" :disabled="!connected">
           Отключиться
        </button>
        <button class="action-btn" @click="clearLogs">
           Очистить
        </button>
        <button class="action-btn" @click="downloadLogs" :disabled="!logs">
           Скачать
        </button>
      </div>
    </div>

    <div class="logs-container" ref="logsContainer">
      <pre class="logs-output" v-html="formattedLogs"></pre>
      <div v-if="!logs && !connected" class="logs-placeholder">
        Выберите контейнер и нажмите «Подключиться»
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { fetchContainers, createLogsEventSource } from '../services/dockerApi'

const containers = ref([])
const selectedContainerId = ref(null)
const logs = ref('')
const connected = ref(false)
const connecting = ref(false)
const logsContainer = ref(null)

let sseSource = null

watch(logs, async () => {
  await nextTick()
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight
  }
})

const loadContainers = async () => {
  try {
    containers.value = await fetchContainers()
    if (containers.value.length) {
      selectedContainerId.value = containers.value[0].id
    }
  } catch (e) {
    console.error('Ошибка загрузки контейнеров:', e)
  }
}

const connectLogs = () => {
  if (!selectedContainerId.value) return
  disconnectLogs()
  connecting.value = true
  logs.value = ''
  sseSource = createLogsEventSource(selectedContainerId.value)
  sseSource.onopen = () => {
    connected.value = true
    connecting.value = false
  }
  sseSource.onmessage = (event) => {
    logs.value += event.data + '\n'
  }
  sseSource.onerror = () => {
    connected.value = false
    connecting.value = false
    sseSource?.close()
    sseSource = null
  }
}

const disconnectLogs = () => {
  if (sseSource) {
    sseSource.close()
    sseSource = null
  }
  connected.value = false
  connecting.value = false
}

const clearLogs = () => {
  logs.value = ''
}

const downloadLogs = () => {
  const blob = new Blob([logs.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${selectedContainerId.value}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const formattedLogs = computed(() => {
  return logs.value
    .replace(/error|fail|exception/gi, '<span class="log-error">$&</span>')
    .replace(/warn/gi, '<span class="log-warn">$&</span>')
    .replace(/info/gi, '<span class="log-info">$&</span>')
    .replace(/\n/g, '<br>')
})

onMounted(loadContainers)

onBeforeUnmount(() => {
  disconnectLogs()
})
</script>

<style scoped>
.logs-view {
  padding: 24px;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.logs-header h2 {
  margin: 0;
  font-weight: 600;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.container-select {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 0.9rem;
  min-width: 220px;
  cursor: pointer;
}
.container-select option {
  background: #1e1e2f;
}

.action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.action-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logs-container {
  flex: 1;
  background: #0a0c0f;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.logs-output {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #e2e8f0;
}

.logs-placeholder {
  color: var(--muted);
  text-align: center;
  margin-top: 40px;
}

.logs-output :deep(.log-error) {
  color: #ff6b6b;
  font-weight: 500;
}
.logs-output :deep(.log-warn) {
  color: #fbbf24;
}
.logs-output :deep(.log-info) {
  color: #60a5fa;
}
</style>