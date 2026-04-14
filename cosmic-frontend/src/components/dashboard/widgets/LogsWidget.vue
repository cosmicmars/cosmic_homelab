<template>
  <div class="logs-widget">
    <select v-model="selectedContainerId" @change="onContainerChange">
      <option v-for="c in containers" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <button @click="connectLogs" :disabled="!selectedContainerId || connected"> Подключить</button>
    <button @click="disconnectLogs" :disabled="!connected">■ Отключить</button>
    <pre class="log-output">{{ logs }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { fetchContainers, createLogsEventSource } from '../../../services/dockerApi'
import { useSse } from '../../../composables/useSse'

const containers = ref([])
const selectedContainerId = ref(null)
const { data, connected, connect, disconnect } = useSse(createLogsEventSource)
const logs = ref('')

const connectLogs = () => {
  if (selectedContainerId.value) {
    logs.value = ''
    connect(selectedContainerId.value)
  }
}
const disconnectLogs = () => disconnect()
const onContainerChange = () => {
  if (connected.value) {
    connectLogs()
  }
}

watch(data, (newData) => {
  if (newData) {
    logs.value += newData + '\n'
  }
})

onMounted(async () => {
  containers.value = await fetchContainers()
  if (containers.value.length) {
    selectedContainerId.value = containers.value[0].id
  }
})

onUnmounted(() => disconnect())
</script>

<style scoped>
.logs-widget { height: 100%; display: flex; flex-direction: column; padding: 8px; }
select, button { margin-bottom: 8px; padding: 6px; background: var(--panel); color: white; border: 1px solid var(--border); border-radius: 4px; }
.log-output { flex: 1; background: #0a0c10; padding: 8px; border-radius: 4px; overflow: auto; font-size: 12px; margin: 0; }
</style>