<template>
  <div class="welcome-container">
    <div class="welcome-card">
      <h1 class="welcome-title">Добро пожаловать в Cosmic</h1>
      <p class="welcome-subtitle">Управляйте вашими Docker‑контейнерами с лёгкостью</p>
      <p class="welcome-description">
        Cosmic — это современный инструмент для мониторинга и управления контейнерами.
        Перетаскивайте вкладки, создавайте собственные дашборды и следите за состоянием ваших серверов.
      </p>
    </div>

    <!-- Секция с Docker-хостами -->
    <div class="hosts-section">
      <div class="hosts-header">
        <h2>Доступные Docker‑хосты</h2>
        <button class="add-host-btn" @click="showAddForm = !showAddForm">
          {{ showAddForm ? 'Отмена' : '+ Добавить хост' }}
        </button>
      </div>

      <!-- Форма добавления хоста -->
      <div v-if="showAddForm" class="add-host-form">
        <input v-model="newHost.name" type="text" placeholder="Название хоста" />
        <input v-model="newHost.url" type="text" placeholder="URL (unix://..., npipe://..., tcp://...)" />
        <button @click="addHost" :disabled="!newHost.name || !newHost.url || adding">Добавить</button>
      </div>

      <div v-if="loading">Загрузка...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="hosts.length === 0" class="no-hosts">
        <p>Нет доступных Docker‑хостов.</p>
        <p>Добавьте первый хост, нажав кнопку выше.</p>
      </div>
      <div v-else class="hosts-grid">
        <div
          v-for="host in hosts"
          :key="host.id"
          class="host-card"
          :class="{ offline: !host.online }"
          @click="connectToDockerHost(host)"
        >
          <div v-if="connecting === host.id" class="connecting-overlay">
            Подключение...
          </div>
          <button class="delete-host-btn" @click.stop="deleteHost(host.id)" title="Удалить хост">✕</button>
          <div class="host-header">
            <img src="/docker-icon.png" alt="Docker" class="docker-icon" />
            <span class="host-name">{{ host.name }}</span>
            <span :class="['status-dot', host.online ? 'online' : 'offline']"></span>
          </div>
          <div class="host-url">{{ formatUrl(host.url) }}</div>
          <div class="host-details">
            <div><strong>ОС:</strong> {{ host.os }}</div>
            <div><strong>Память:</strong> {{ host.memory_total }} ГБ всего</div>
            <div v-if="host.local" class="host-tag local">Локальный</div>
            <div v-else class="host-tag remote">Удалённый</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchHosts, connectToHost, addHost as apiAddHost, deleteHost as apiDeleteHost } from '../services/dockerApi'
import { useDockerConnection } from '../composables/useDockerConnection'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { setHost } = useDockerConnection()

const hosts = ref([])
const loading = ref(true)
const error = ref(null)
const connecting = ref(null)

// Форма добавления
const showAddForm = ref(false)
const adding = ref(false)
const newHost = ref({ name: '', url: '' })

// Отладочный лог
onMounted(() => {
  console.log('WelcomeView mounted, route.query:', route.query)
  if (route.query.reason === 'no_connection') {
    toast.warning('Подключитесь к Docker-хосту для доступа к этой странице', 4000)
  }
  loadHosts()
})

watch(() => route.query.reason, (reason) => {
  if (reason === 'no_connection') {
    toast.warning('Подключитесь к Docker-хосту для доступа к этой странице', 4000)
  }
})

const formatUrl = (url) => {
  if (url.startsWith('unix://')) return 'Unix Socket'
  if (url.startsWith('npipe://')) return 'Windows Pipe'
  return url.replace(/^tcp:\/\//, '')
}

const loadHosts = async () => {
  loading.value = true
  error.value = null
  try {
    hosts.value = await fetchHosts()
  } catch (e) {
    error.value = 'Не удалось загрузить список хостов'
  } finally {
    loading.value = false
  }
}

const connectToDockerHost = async (host) => {
  if (!host.online) return
  connecting.value = host.id
  try {
    await connectToHost(host.url)
    setHost(host)
    toast.success(`Подключено к ${host.name}`, 2000)
    console.log(' Redirecting to dashboard...')
    router.push('/dashboard')
  } catch (e) {
    toast.error('Не удалось подключиться к хосту: ' + e.message)
  } finally {
    connecting.value = null
  }
}

const addHost = async () => {
  if (!newHost.value.name || !newHost.value.url) return
  adding.value = true
  try {
    await apiAddHost({
      name: newHost.value.name,
      url: newHost.value.url
    })
    newHost.value = { name: '', url: '' }
    showAddForm.value = false
    await loadHosts()
    toast.success('Хост добавлен')
  } catch (e) {
    toast.error('Ошибка при добавлении хоста: ' + e.message)
  } finally {
    adding.value = false
  }
}

const deleteHost = async (hostId) => {
  if (!confirm('Удалить этот хост?')) return
  try {
    await apiDeleteHost(hostId)
    await loadHosts()
    toast.info('Хост удалён')
  } catch (e) {
    toast.error('Ошибка при удалении хоста: ' + e.message)
  }
}
</script>

<style scoped>
.welcome-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
}

.welcome-card {
  max-width: 700px;
  background: rgba(18, 20, 24, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  margin-bottom: 40px;
}

.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--cyan), #a8edea);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.welcome-subtitle {
  font-size: 1.5rem;
  color: var(--text);
  margin-bottom: 24px;
}

.welcome-description {
  color: var(--muted);
  line-height: 1.6;
}

.hosts-section {
  width: 100%;
  max-width: 900px;
}

.hosts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.hosts-header h2 {
  color: var(--text);
  margin: 0;
}

.add-host-btn {
  background: var(--cyan);
  color: #000;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.add-host-btn:hover {
  opacity: 0.9;
}

.add-host-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  background: rgba(0,0,0,0.2);
  padding: 16px;
  border-radius: 12px;
}
.add-host-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #1e1e2f;
  color: white;
}
.add-host-form button {
  padding: 10px 20px;
  background: var(--green);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.add-host-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hosts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.host-card {
  position: relative;
  background: rgba(18, 20, 24, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}
.host-card:hover {
  border-color: var(--cyan);
  transform: translateY(-2px);
}
.host-card.offline {
  opacity: 0.7;
  border-color: var(--red);
}

.delete-host-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--border);
  color: var(--muted);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
}
.delete-host-btn:hover {
  background: var(--red);
  color: white;
  border-color: var(--red);
}

.host-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.docker-icon {
  width: 28px;
  height: 28px;
}

.host-name {
  font-weight: 600;
  color: var(--text);
  flex: 1;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-dot.online {
  background: var(--green);
  box-shadow: 0 0 8px var(--green);
}
.status-dot.offline {
  background: var(--red);
}

.host-url {
  margin: 8px 0;
  font-size: 0.85rem;
  color: var(--muted);
  word-break: break-all;
}

.host-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.85rem;
}

.host-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.host-tag.local {
  background: var(--cyan);
  color: #000;
}
.host-tag.remote {
  background: #4a5568;
  color: white;
}

.connecting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: var(--cyan);
  font-weight: 500;
  z-index: 10;
}

.no-hosts {
  color: var(--muted);
  padding: 20px;
  text-align: center;
}

.error {
  color: var(--red);
  text-align: center;
}
</style>