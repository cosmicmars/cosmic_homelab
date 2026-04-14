import { ref, onUnmounted } from 'vue'

export function useSse(createSource) {
  const data = ref(null)
  const error = ref(null)
  const connected = ref(false)
  let source = null

  const connect = (containerId) => {
    disconnect()
    source = createSource(containerId)
    source.onopen = () => { connected.value = true }
    source.onmessage = (e) => {
      try {
        data.value = JSON.parse(e.data)
      } catch {
        data.value = e.data
      }
    }
    source.onerror = (e) => {
      error.value = e
      connected.value = false
    }
  }

  const disconnect = () => {
    if (source) {
      source.close()
      source = null
      connected.value = false
    }
  }

  onUnmounted(disconnect)

  return { data, error, connected, connect, disconnect }
}