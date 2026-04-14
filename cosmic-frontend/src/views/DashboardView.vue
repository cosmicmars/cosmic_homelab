<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Custom Dashboard</h1>
      <button class="settings" @click="resetLayout">Сбросить макет</button>
    </div>
    <SplitView v-model="panels" :dragging-type="draggingType" />
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import SplitView from '../components/common/SplitView.vue'

const draggingType = inject('draggingType', null)

const panels = ref([
  { id: `initial-${Date.now()}`, type: 'servers', size: 100 }
])

const resetLayout = () => {
  panels.value = [
    { id: `initial-${Date.now()}`, type: 'servers', size: 100 }
  ]
}
</script>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
</style>