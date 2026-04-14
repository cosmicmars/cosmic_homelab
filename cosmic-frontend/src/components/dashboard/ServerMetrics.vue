<template>
  <div class="server-metrics">
    <div class="card cyan">
      <h4>CPU: {{ metrics?.cpu?.toFixed(2) || '--' }}%</h4>
      <canvas ref="cpuCanvas"></canvas>
    </div>
    <div class="card green">
      <h4>Uptime: {{ metrics?.uptime || '--' }}</h4>
      <canvas ref="uptimeCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps(['serverId'])
const metrics = ref(null)
const cpuCanvas = ref(null)
const uptimeCanvas = ref(null)

// Заглушка для получения метрик (потом заменишь на реальные запросы)
const fetchMetrics = async (serverId) => {
  // Пример: const res = await fetch(`/api/container/${serverId}/cpu`)
  // Пока возвращаем тестовые данные
  return {
    cpu: Math.random() * 100,
    uptime: '3 days'
  }
}

watch(() => props.serverId, async (newId) => {
  if (newId) {
    metrics.value = await fetchMetrics(newId)
  }
}, { immediate: true })

onMounted(() => {
  // Здесь позже добавишь рисование графиков на canvas
})
</script>

<style scoped>
.server-metrics {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  color: white;
  flex: 1;
}

.card.cyan { border-top: 3px solid var(--cyan); }
.card.green { border-top: 3px solid var(--green); }

canvas {
  width: 100%;
  height: 80px;
  margin-top: 8px;
}
</style>