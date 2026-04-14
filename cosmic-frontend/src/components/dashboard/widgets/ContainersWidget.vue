<template>
  <div class="containers-widget">
    <div v-if="loading">Загрузка образов...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <ul v-else class="image-list">
      <li v-for="img in images" :key="img">{{ img }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchImages } from '../../../services/dockerApi'

const images = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    images.value = await fetchImages()
  } catch (e) {
    error.value = 'Не удалось загрузить образы'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.containers-widget { height: 100%; overflow: auto; padding: 8px; }
.image-list { list-style: none; padding: 0; margin: 0; }
.image-list li { padding: 6px 0; border-bottom: 1px solid var(--border); }
.error { color: var(--red); }
</style>