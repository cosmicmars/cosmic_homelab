<template>
  <div class="page">
    <h1>{{ pageTitle }}</h1>
    <p>Страница в разработке</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => route.path.slice(1) || 'Dashboard')
</script>

<style scoped>
.page {
  padding: 24px;
  color: white;
}
</style>