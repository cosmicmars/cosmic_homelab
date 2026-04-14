<template>
  <div class="servers-view">
    <div class="servers-header">
      <h2>Контейнеры</h2>
      <div class="header-actions">
        <div class="search-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по имени или ID..."
            class="search-input"
          />
        </div>
        <button class="refresh-btn" @click="loadContainers" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>🔄</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-else-if="filteredContainers.length === 0 && !loading" class="no-containers">
      <p>Нет контейнеров</p>
    </div>

    <div v-else class="containers-table-wrapper">
      <table class="containers-table">
        <thead>
          <tr>
            <th>Имя</th>
            <th>ID</th>
            <th>Статус</th>
            <th>Образ</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredContainers" :key="c.id">
            <td class="container-name">{{ c.name }}</td>
            <td class="container-id">{{ c.id }}</td>
            <td>
              <span :class="['status-badge', c.status]">{{ c.status }}</span>
            </td>
            <td class="container-image">{{ c.image || '—' }}</td>
            <td class="actions-cell">
              <button
                v-if="c.status !== 'running'"
                class="action-icon start"
                @click="handleStart(c.id)"
                :disabled="acting === c.id"
                title="Запустить"
              >
                <span v-if="acting === c.id" class="mini-spinner"></span>
                <span v-else>▶</span>
              </button>
              <button
                v-else
                class="action-icon stop"
                @click="handleStop(c.id)"
                :disabled="acting === c.id"
                title="Остановить"
              >
                <span v-if="acting === c.id" class="mini-spinner"></span>
                <span v-else>■</span>
              </button>
              <button
                class="action-icon remove"
                @click="handleRemove(c)"
                :disabled="acting === c.id"
                title="Удалить"
              >
                <span v-if="acting === c.id" class="mini-spinner"></span>
                <span v-else>🗑</span>
              </button>
              <button
                class="action-icon logs"
                @click="viewLogs(c.id)"
                title="Логи"
              >
                📋
              </button>
              <button
                class="action-icon metrics"
                @click="selectedContainerId = c.id"
                title="Метрики"
              >
                📊
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Панель метрик -->
    <div v-if="selectedContainerId" class="metrics-panel">
      <div class="metrics-header">
        <h3>Метрики: {{ selectedContainerName }}</h3>
        <button class="close-btn" @click="selectedContainerId = null">✕</button>
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>CPU</h4>
          <div class="value">{{ metrics.cpu?.toFixed(2) || '--' }}%</div>
          <div class="chart-container">
            <canvas ref="cpuChartCanvas"></canvas>
          </div>
        </div>
        <div class="metric-card">
          <h4>Uptime</h4>
          <div class="value">{{ metrics.uptime || '--' }}</div>
        </div>
        <div class="metric-card">
          <h4>IP адреса</h4>
          <pre>{{ JSON.stringify(metrics.ip, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchContainers,
  startContainer,
  stopContainer,
  removeContainer,
  fetchContainerMetrics
} from '../services/dockerApi'
import { useMetrics } from '../composables/useMetrics'
import Chart from 'chart.js/auto'


const router = useRouter()

const containers = ref([])
const loading = ref(false)
const error = ref(null)
const acting = ref(null)
const searchQuery = ref('')

const filteredContainers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return containers.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  )
})

const selectedContainerId = ref(null)
const selectedContainerName = computed(() => {
  const c = containers.value.find(c => c.id === selectedContainerId.value)
  return c ? c.name : selectedContainerId.value
})

const { metrics, cpuHistory, startAutoUpdate, stopAutoUpdate } = useMetrics()
const cpuChartCanvas = ref(null)
let cpuChart = null

const loadContainers = async () => {
  loading.value = true
  error.value = null
  try {
    containers.value = await fetchContainers()
  } catch (e) {
    error.value = 'Не удалось загрузить контейнеры: ' + e.message
  } finally {
    loading.value = false
  }
}

const handleStart = async (id) => {
  acting.value = id
  try {
    await startContainer(id)
    await loadContainers()
  } catch (e) {
    alert('Ошибка запуска: ' + e.message)
  } finally {
    acting.value = null
  }
}

const handleStop = async (id) => {
  acting.value = id
  try {
    await stopContainer(id)
    await loadContainers()
  } catch (e) {
    alert('Ошибка остановки: ' + e.message)
  } finally {
    acting.value = null
  }
}

const handleRemove = async (container) => {
  if (!confirm(`Удалить контейнер ${container.name}?`)) return
  acting.value = container.id
  try {
    await removeContainer(container.name)
    await loadContainers()
  } catch (e) {
    alert('Ошибка удаления: ' + e.message)
  } finally {
    acting.value = null
  }
}

const viewLogs = (id) => {
  router.push({ name: 'logs', query: { container: id } })
}

// График CPU
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
    startAutoUpdate(newId, async (data) => {
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

onBeforeUnmount(() => {
  stopAutoUpdate()
  if (cpuChart) {
    cpuChart.destroy()
    cpuChart = null
  }
})

onMounted(loadContainers)
</script>

<style scoped>
.servers-view {
  padding: 24px;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.servers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.servers-header h2 {
  margin: 0;
  font-weight: 600;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-wrapper {
  position: relative;
}

.search-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 0.9rem;
  width: 260px;
  transition: border-color 0.2s;
}
.search-input:focus {
  outline: none;
  border-color: var(--cyan);
}
.search-input::placeholder {
  color: var(--muted);
}

.refresh-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: var(--cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error {
  color: var(--red);
  text-align: center;
  padding: 20px;
}

.no-containers {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

.containers-table-wrapper {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  background: rgba(18, 20, 24, 0.5);
  backdrop-filter: blur(4px);
  border: 1px solid var(--border);
}

.containers-table {
  width: 100%;
  border-collapse: collapse;
}

.containers-table th {
  text-align: left;
  padding: 16px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 2;
  backdrop-filter: blur(4px);
}

.containers-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.containers-table tbody tr {
  transition: background 0.15s;
}
.containers-table tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.container-name {
  font-weight: 500;
  color: var(--text);
}

.container-id {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 0.85rem;
  color: var(--muted);
}

.container-image {
  font-size: 0.9rem;
  color: var(--muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.status-badge.created, .status-badge.paused {
  background: #4a5568;
  color: white;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-icon {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: var(--muted);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.action-icon:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}
.action-icon.start:hover { background: var(--green); color: black; }
.action-icon.stop:hover { background: #f59e0b; color: black; }
.action-icon.remove:hover { background: var(--red); color: white; }
.action-icon.logs:hover { background: #3b82f6; color: white; }
.action-icon.metrics:hover { background: #8b5cf6; color: white; }
.action-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Метрики */
.metrics-panel {
  margin-top: 24px;
  padding: 20px;
  background: rgba(18, 20, 24, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 16px;
  flex-shrink: 0;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.metrics-header h3 {
  margin: 0;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 20px;
  cursor: pointer;
}
.close-btn:hover { color: var(--red); }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.metric-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
}

.metric-card h4 {
  margin: 0 0 8px;
  color: var(--muted);
  font-weight: 500;
}

.value {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.chart-container {
  height: 80px;
  width: 100%;
}
</style>