<template>
  <div class="alerts-view">
    <div class="alerts-header">
      <h2>События Docker</h2>
      <div class="header-actions">
        <div class="search-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по действию или объекту..."
            class="search-input"
          />
        </div>
        <select v-model="filterType" class="filter-select">
          <option value="">Все типы</option>
          <option value="container">Контейнеры</option>
          <option value="image">Образы</option>
          <option value="volume">Тома</option>
          <option value="network">Сети</option>
        </select>
        <button
          class="connect-btn"
          :class="{ connected: connected, disconnected: !connected }"
          @click="toggleConnection"
        >
          {{ connected ? 'Отключиться' : 'Подключиться' }}
        </button>
        <button class="clear-btn" @click="clearEvents">Очистить</button>
      </div>
    </div>

    <div class="alerts-table-wrapper">
      <table class="alerts-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>Тип</th>
            <th>Действие</th>
            <th>Объект</th>
            <th>Детали</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(event, index) in filteredEvents"
            :key="index"
            :class="getEventClass(event)"
          >
            <td class="time">{{ formatTime(event.time) }}</td>
            <td class="type">
              <span :class="['type-badge', event.Type]">{{ event.Type }}</span>
            </td>
            <td class="action">{{ event.Action }}</td>
            <td class="actor">{{ getActorName(event) }}</td>
            <td class="details">{{ getEventDetails(event) }}</td>
          </tr>
          <tr v-if="filteredEvents.length === 0">
            <td colspan="5" class="no-events">
              {{ connected ? 'Ожидание событий...' : 'Подключитесь для получения событий' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { createEventsEventSource } from '../services/dockerApi'

const events = ref([])
const connected = ref(false)
const searchQuery = ref('')
const filterType = ref('')
let eventSource = null

const filteredEvents = computed(() => {
  let filtered = events.value
  if (filterType.value) {
    filtered = filtered.filter(e => e.Type === filterType.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(e =>
      e.Action.toLowerCase().includes(q) ||
      getActorName(e).toLowerCase().includes(q)
    )
  }
  return filtered
})

const toggleConnection = () => {
  if (connected.value) {
    disconnect()
  } else {
    connect()
  }
}

const connect = () => {
  if (eventSource) eventSource.close()
  eventSource = createEventsEventSource()
  eventSource.onopen = () => {
    connected.value = true
  }
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      events.value.unshift(data)
      if (events.value.length > 500) {
        events.value.pop()
      }
    } catch (err) {
      console.error('Ошибка парсинга события:', err)
    }
  }
  eventSource.onerror = () => {
    connected.value = false
  }
}

const disconnect = () => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  connected.value = false
}

const clearEvents = () => {
  events.value = []
}

const formatTime = (timestamp) => {
  if (!timestamp) return '—'
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString() + ' ' + date.toLocaleDateString()
}

const getActorName = (event) => {
  if (event.Actor && event.Actor.Attributes) {
    return event.Actor.Attributes.name || event.Actor.ID?.substring(0, 12) || '—'
  }
  return event.Actor?.ID?.substring(0, 12) || '—'
}

const getEventDetails = (event) => {
  if (event.Actor && event.Actor.Attributes) {
    const attrs = event.Actor.Attributes
    if (attrs.image) return `Образ: ${attrs.image}`
    if (attrs.name) return `Имя: ${attrs.name}`
  }
  return '—'
}

const getEventClass = (event) => {
  if (event.Action.includes('die') || event.Action.includes('kill') || event.Action.includes('stop'))
    return 'event-warning'
  if (event.Action.includes('destroy') || event.Action.includes('delete'))
    return 'event-danger'
  if (event.Action.includes('create') || event.Action.includes('start'))
    return 'event-success'
  return ''
}

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped>
.alerts-view {
  padding: 24px;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.alerts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.alerts-header h2 {
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
}
.search-input:focus {
  outline: none;
  border-color: var(--cyan);
}

.filter-select {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
}
.filter-select option {
  background: #1e1e2f;
}

.connect-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.connect-btn.connected {
  background: var(--red);
  color: white;
}
.connect-btn.disconnected {
  background: var(--green);
  color: black;
}

.clear-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.alerts-table-wrapper {
  flex: 1;
  overflow-y: auto;
  border-radius: 12px;
  background: rgba(18, 20, 24, 0.5);
  backdrop-filter: blur(4px);
  border: 1px solid var(--border);
}

.alerts-table {
  width: 100%;
  border-collapse: collapse;
}

.alerts-table th {
  text-align: left;
  padding: 16px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 2;
}

.alerts-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.alerts-table tbody tr {
  transition: background 0.15s;
}
.alerts-table tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.time {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--muted);
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}
.type-badge.container { background: #3b82f6; color: white; }
.type-badge.image { background: #8b5cf6; color: white; }
.type-badge.volume { background: #f59e0b; color: black; }
.type-badge.network { background: #10b981; color: white; }

.event-warning td { background: rgba(245, 158, 11, 0.1); }
.event-danger td { background: rgba(239, 68, 68, 0.1); }
.event-success td { background: rgba(16, 185, 129, 0.1); }

.no-events {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}
</style>