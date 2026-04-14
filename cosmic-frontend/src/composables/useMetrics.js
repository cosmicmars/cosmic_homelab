import { ref, onUnmounted } from 'vue'
import { fetchContainerMetrics } from '../services/dockerApi'

export function useMetrics() {
  const metrics = ref({ cpu: 0, uptime: '', ip: {} })
  const cpuHistory = ref([])
  const MAX_HISTORY = 30
  let intervalId = null
  let currentServerId = null

  const startAutoUpdate = (serverId, callback) => {
    stopAutoUpdate()
    currentServerId = serverId
    const update = async () => {
      try {
        const data = await fetchContainerMetrics(serverId)
        metrics.value = data
        if (data.cpu !== undefined) {
          let cpuValue = data.cpu
          cpuValue = Math.min(100, Math.max(0, cpuValue)) // на всякий случай
          cpuHistory.value.push(cpuValue)
          if (cpuHistory.value.length > MAX_HISTORY) cpuHistory.value.shift()
        }
        if (callback) callback(data)
      } catch (e) {
        console.error('Metrics update failed', e)
      }
    }
    update()
    intervalId = setInterval(update, 3000)
  }

  const stopAutoUpdate = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    currentServerId = null
  }

  onUnmounted(stopAutoUpdate)

  return { metrics, cpuHistory, startAutoUpdate, stopAutoUpdate }
}