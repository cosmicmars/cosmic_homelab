<template>
  <div class="containers-view">
    <div class="header">
      <h2>Docker Образы</h2>
      <button class="refresh-btn" @click="loadImages" :disabled="loading">
        {{ loading ? 'Загрузка...' : ' Обновить' }}
      </button>
    </div>

    <div v-if="loading && images.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка образов...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadImages">Попробовать снова</button>
    </div>

    <div v-else-if="images.length === 0" class="empty-state">
      <p>Нет доступных образов</p>
    </div>

    <div v-else class="images-grid">
      <div v-for="image in images" :key="image.id" class="image-card">
        <div class="image-icon">
          <img src="/docker-icon.png" alt="Docker" />
        </div>
        <div class="image-info">
          <h3 class="image-name">{{ formatImageName(image.name) }}</h3>
          <div class="image-meta">
            <span class="tag">{{ image.tag }}</span>
            <span class="size" v-if="image.size">{{ formatSize(image.size) }}</span>
            <span class="created" v-if="image.created">{{ formatDate(image.created) }}</span>
          </div>
        </div>
        <div class="image-actions">
          <button class="action-btn run" @click="handleRunImage(image)" title="Запустить контейнер">
          </button>
          <button class="action-btn delete" @click="handleDeleteImage(image)" title="Удалить образ">            
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchImages, removeImage, runImage } from '../services/dockerApi'

const images = ref([])
const loading = ref(false)
const error = ref(null)

const formatImageName = (fullName) => {
  if (!fullName) return '<none>'
  const parts = fullName.split('/')
  return parts[parts.length - 1]
}

const formatSize = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString()
}

const loadImages = async () => {
  loading.value = true
  error.value = null
  try {
    const rawImages = await fetchImages()
    images.value = rawImages.map((tag, index) => ({
      id: index,
      name: tag,
      tag: tag,
      size: null,
      created: null
    }))
  } catch (e) {
    error.value = 'Не удалось загрузить образы: ' + e.message
  } finally {
    loading.value = false
  }
}

const handleRunImage = async (image) => {
  const containerName = prompt('Введите имя контейнера (опционально):')
  const command = prompt('Введите команду (опционально, по умолчанию из образа):')
  try {
    const result = await runImage(image.name, {
      name: containerName || undefined,
      cmd: command || undefined
    })
    alert(`Контейнер запущен: ${result.id}`)
  } catch (e) {
    alert('Ошибка запуска: ' + e.message)
  }
}

const handleDeleteImage = async (image) => {
  if (!confirm(`Удалить образ ${image.name}?`)) return
  try {
    await deleteImage(image.name)
    await loadImages()
  } catch (e) {
    alert('Ошибка удаления: ' + e.message)
  }
}

onMounted(loadImages)
</script>

<style scoped>
.containers-view {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  color: var(--text);
  margin: 0;
}

.refresh-btn {
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) {
  background: var(--cyan);
  color: #000;
  border-color: var(--cyan);
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.image-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, border-color 0.2s;
}
.image-card:hover {
  border-color: var(--cyan);
  transform: translateY(-2px);
}

.image-icon {
  width: 48px;
  height: 48px;
  background: rgba(77, 230, 209, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.image-icon img {
  width: 32px;
  height: 32px;
  opacity: 0.8;
}

.image-info {
  flex: 1;
  min-width: 0;
}

.image-name {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--muted);
}
.image-meta span {
  background: rgba(255,255,255,0.05);
  padding: 2px 8px;
  border-radius: 12px;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.action-btn.run:hover {
  background: var(--green);
  border-color: var(--green);
  color: #000;
}
.action-btn.delete:hover {
  background: var(--red);
  border-color: var(--red);
  color: white;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--muted);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.error-state button {
  margin-top: 16px;
  background: var(--cyan);
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
}
</style>