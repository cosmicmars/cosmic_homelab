<template>
  <div class="metrics-widget">
    <div class="widget-header">
      <h3>Метрики контейнера</h3>
      <select v-model="selectedContainerId" class="container-select">
        <option v-for="c in containers" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="!selectedContainerId" class="no-selection">
      Выберите контейнер для просмотра метрик
    </div>

    <div v-else class="metrics-content">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- CPU -->
        <div v-show="activeTab === 'cpu'" class="metric-section">
          <div class="metric-header">
            <span>Использование CPU</span>
            <span class="metric-value">{{ metrics.cpu?.toFixed(2) || '--' }}%</span>
          </div>
          <div class="chart-container">
            <canvas ref="cpuChartCanvas"></canvas>
          </div>
          <div class="metric-footer">
            <span>Обновляется каждые 3 сек</span>
          </div>
        </div>

        <!-- Memory -->
        <div v-show="activeTab === 'memory'" class="metric-section">
          <div class="metric-header">
            <span>Использование памяти</span>
            <span class="metric-value">{{ formatMemory(metrics.memory_usage) }} / {{ formatMemory(metrics.memory_limit) }}</span>
          </div>
          <div class="memory-bar">
            <div class="memory-bar-fill" :style="{ width: memoryPercent + '%' }"></div>
          </div>
          <div class="memory-stats">
            <div>Использовано: {{ formatMemory(metrics.memory_usage) }}</div>
            <div>Лимит: {{ formatMemory(metrics.memory_limit) }}</div>
            <div>Процент: {{ memoryPercent }}%</div>
          </div>
        </div>

        <!-- Info -->
        <div v-show="activeTab === 'info'" class="metric-section">
          <table class="info-table">
            <tr><th>ID</th><td>{{ selectedContainerId }}</td></tr>
            <tr><th>Имя</th><td>{{ selectedContainerName }}</td></tr>
            <tr><th>Статус</th><td><span :class="['status-badge', containerStatus]">{{ containerStatus }}</span></td></tr>
            <tr><th>Uptime</th><td>{{ metrics.uptime || '—' }}</td></tr>
            <tr><th>IP адреса</th><td><pre>{{ JSON.stringify(metrics.ip, null, 2) }}</pre></td></tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { fetchContainers, fetchContainerMetrics } from '../../../services/dockerApi'
import { useMetrics } from '../../../composables/useMetrics'
import Chart from 'chart.js/auto'

const containers = ref([])
const selectedContainerId = ref(null)
const selectedContainerName = computed(() => {
  const c = containers.value.find(c => c.id === selectedContainerId.value)
  return c ? c.name : ''
})
const containerStatus = computed(() => {
  const c = containers.value.find(c => c.id === selectedContainerId.value)
  return c ? c.status : 'unknown'
})

const { metrics, cpuHistory, startAutoUpdate, stopAutoUpdate } = useMetrics()
const cpuChartCanvas = ref(null)
let cpuChart = null

const activeTab = ref('cpu')
const tabs = [
  { id: 'cpu', label: 'CPU' },
  { id: 'memory', label: 'Память' },
  { id: 'info', label: 'Информация' }
]


const viewLogs = (id) => {
  router.push({ name: 'logs', query: { container: id } })
}


const memoryPercent = computed(() => {
  if (!metrics.value.memory_usage || !metrics.value.memory_limit) return 0
  return ((metrics.value.memory_usage / metrics.value.memory_limit) * 100).toFixed(1)
})

const formatMemory = (bytes) => {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(2)} ${units[i]}`
}

const initChart = () => {
  if (!cpuChartCanvas.value) return
  if (cpuChart) cpuChart.destroy()
  cpuChart = new Chart(cpuChartCanvas.value, {
    type: 'line',
    data: {
      labels: Array(cpuHistory.value.length).fill(''),
      datasets: [{
        label: 'CPU %',
        data: cpuHistory.value,
        borderColor: '#4de6d1',
        backgroundColor: 'rgba(77, 230, 209, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { display: false }
      }
    }
  })
}

const updateChart = () => {
  if (!cpuChart) {
    initChart()
  } else {
    cpuChart.data.labels = Array(cpuHistory.value.length).fill('')
    cpuChart.data.datasets[0].data = [...cpuHistory.value]
    cpuChart.update()
  }
}

watch(selectedContainerId, async (newId) => {
  if (newId) {
    startAutoUpdate(newId, async () => {
      await nextTick()
      updateChart()
    })
  } else {
    stopAutoUpdate()
    if (cpuChart) {
      cpuChart.destroy()
      cpuChart = null
    }
  }
})

watch(cpuHistory, () => {
  updateChart()
}, { deep: true })

onMounted(async () => {
  containers.value = await fetchContainers()
  if (containers.value.length) {
    selectedContainerId.value = containers.value[0].id
  }
})
</script>

<style scoped>
.metrics-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 12px;
  overflow: hidden;
}

.widget-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.widget-header h3 {
  margin: 0;
  font-weight: 600;
}

.container-select {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 12px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.metrics-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs {
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.tab {
  background: none;
  border: none;
  padding: 12px 20px;
  color: var(--muted);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--cyan);
  border-bottom-color: var(--cyan);
}

.tab-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.metric-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-weight: 500;
}

.metric-value {
  color: var(--cyan);
  font-size: 1.2rem;
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.metric-footer {
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.8rem;
  text-align: right;
}

.memory-bar {
  height: 24px;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
}

.memory-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green), var(--cyan));
  border-radius: 12px;
  transition: width 0.3s;
}

.memory-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
  color: var(--muted);
}

.info-table {
  width: 100%;
  border-collapse: collapse;
}
.info-table th {
  text-align: left;
  padding: 12px 8px;
  color: var(--muted);
  font-weight: 500;
  width: 120px;
}
.info-table td {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.info-table pre {
  margin: 0;
  font-family: monospace;
  color: var(--text);
  white-space: pre-wrap;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}
.status-badge.running {
  background: var(--green);
  color: #000;
}
.status-badge.exited {
  background: var(--red);
  color: white;
}
</style>