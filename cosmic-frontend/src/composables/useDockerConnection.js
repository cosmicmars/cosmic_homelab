import { ref, computed } from 'vue'

const STORAGE_KEY = 'cosmic_docker_host'

const currentHost = ref(null)
const connectionStatus = ref(false)

const saved = localStorage.getItem(STORAGE_KEY)
if (saved) {
  try {
    currentHost.value = JSON.parse(saved)
    connectionStatus.value = true
  } catch (e) {}
}

export function useDockerConnection() {
  const setHost = (host) => {
    currentHost.value = host
    connectionStatus.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(host))
    console.log('Host set, isConnected =', connectionStatus.value)
  }

  const clearHost = () => {
    currentHost.value = null
    connectionStatus.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  const isConnected = computed(() => connectionStatus.value)

  return {
    currentHost,
    isConnected,
    setHost,
    clearHost
  }
}