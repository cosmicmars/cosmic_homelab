<template>
  <div class="metrics-widget">
    <select v-model="selectedContainerId" @change="onContainerChange">
      <option v-for="c in containers" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <div v-if="metrics" class="metrics-display">
      <div class="metric-card">
        <h4>CPU</h4>
        <div class="value">{{ metrics.cpu?.toFixed(2) || '--' }}%</div>
        <canvas ref="cpuChartCanvas"></canvas>
      </div>
      <div class="metric-card">
        <h4>Uptime</h4>
        <div class="value">{{ metrics.uptime || '--' }}</div>
      </div>
      <div class="metric-card">
        <h4>IP</h4>
        <pre>{{ JSON.stringify(metrics.ip, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { fetchContainers } from '../../../services/dockerApi'
import { useMetrics } from '../../../composables/useMetrics'
import Chart from 'chart.js/auto'

const containers = ref([])
const selectedContainerId = ref(null)
const cpuChartCanvas = ref(null)
let cpuChart = null

const { metrics, cpuHistory, startAutoUpdate, stopAutoUpdate } = useMetrics()

onMounted(async () => {
  containers.value = await fetchContainers()
  if (containers.value.length) {
    selectedContainerId.value = containers.value[0].id
  }
})

const onContainerChange = () => {
  if (selectedContainerId.value) {
    startAutoUpdate(selectedContainerId.value, async () => {
      await nextTick()
      updateChart()
    })
  } else {
    stopAutoUpdate()
  }
}

const updateChart = () => {
  if (!cpuChartCanvas.value) return
  if (!cpuChart) {
    cpuChart = new Chart(cpuChartCanvas.value, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU %',
          data: cpuHistory.value,
          borderColor: '#4de6d1',
          backgroundColor: 'rgba(77, 230, 209, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    })
  } else {
    cpuChart.data.labels = cpuHistory.value.map((_, i) => i)
    cpuChart.data.datasets[0].data = cpuHistory.value
    cpuChart.update()
  }
}

watch(selectedContainerId, (newId) => {
  if (newId) onContainerChange()
}, { immediate: true })

onUnmounted(() => {
  if (cpuChart) cpuChart.destroy()
  stopAutoUpdate()
})
</script>

<style scoped>
.metrics-widget { height: 100%; overflow: auto; padding: 12px; }
select { width: 100%; padding: 8px; margin-bottom: 16px; background: var(--panel); color: white; border: 1px solid var(--border); border-radius: 6px; }
.metrics-display { display: flex; flex-direction: column; gap: 16px; }
.metric-card { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; }
.value { font-size: 1.5rem; font-weight: bold; margin: 8px 0; }
canvas { width: 100%; height: 120px; }
</style>