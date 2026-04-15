<template>
  <div class="page">
    <LogsWidget />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchContainers, createLogsEventSource } from '../services/dockerApi'
import { useToast } from '../composables/useToast'
import LogsWidget from '../components/dashboard/widgets/LogsWidget.vue'
</script>

<style scoped>
.page {
  height: 100%;
  padding: 24px;
  overflow: auto;
}
</style>