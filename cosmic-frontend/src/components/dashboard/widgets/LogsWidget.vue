<template>
  <div class="logs-widget">
    <div class="widget-header">
      <h4>Логи контейнера</h4>
      <select v-model="selectedContainerId" class="container-select">
        <option v-for="c in containers" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>
    <div class="logs-container" ref="logContainer">
      <div v-for="(line, idx) in logLines" :key="idx" class="log-line">{{ line }}</div>
    </div>
    <div class="widget-footer">
      <button @click="toggleConnection" :class="['action-btn', connected ? 'disconnect' : 'connect']">
        {{ connected ? 'Отключиться' : 'Подключиться' }}
      </button>
      <button @click="clearLogs" class="action-btn clear">Очистить</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { fetchContainers, createLogsEventSource } from '../../../services/dockerApi'
import { useToast } from '../../../composables/useToast'

const toast = useToast()
const containers = ref([])
const selectedContainerId = ref(null)
const logLines = ref([])
const connected = ref(false)
const logContainer = ref(null)
let eventSource = null

const MAX_LINES = 500

const loadContainers = async () => {
  try {
    containers.value = await fetchContainers()
    if (containers.value.length) {
      selectedContainerId.value = containers.value[0].id
    }
  } catch (e) {
    toast.error('Не удалось загрузить контейнеры')
  }
}

const toggleConnection = () => {
  if (connected.value) {
    disconnect()
  } else {
    connect()
  }
}

const connect = () => {
  if (!selectedContainerId.value) {
    toast.warning('Выберите контейнер')
    return
  }
  disconnect()
  eventSource = createLogsEventSource(selectedContainerId.value)
  eventSource.onopen = () => {
    connected.value = true
  }
  eventSource.onmessage = (e) => {
    logLines.value.push(e.data)
    if (logLines.value.length > MAX_LINES) {
      logLines.value = logLines.value.slice(-MAX_LINES)
    }
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }
  eventSource.onerror = () => {
    connected.value = false
    toast.error('Ошибка подключения к логам')
  }
}

const disconnect = () => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  connected.value = false
}

const clearLogs = () => {
  logLines.value = []
}

watch(selectedContainerId, () => {
  if (connected.value) {
    connect()
  }
})

onMounted(loadContainers)
onUnmounted(disconnect)
</script>

<style scoped>
.logs-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 12px;
  overflow: hidden;
}
.widget-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}
.widget-header h4 {
  margin: 0;
  font-weight: 600;
}
.container-select {
  flex: 1;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: white;
  font-size: 0.9rem;
}
.logs-container {
  flex: 1;
  overflow: hidden;
  background: #0d1117;
}
.log-output {
  height: 100%;
  margin: 0;
  padding: 12px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #e6edf3;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
}
.widget-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
}
.action-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.action-btn.connect {
  background: var(--green);
  color: black;
}
.action-btn.disconnect {
  background: var(--red);
  color: white;
}
.action-btn.clear {
  background: rgba(255,255,255,0.1);
  color: white;
}
</style>