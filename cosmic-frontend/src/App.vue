<template>
  <StarsCanvas />
  <div id="layout" :class="{ 'sidebar-right': sidebarPosition === 'right' }">
    <Sidebar :position="sidebarPosition" @drag-start="onDragStart" @drag-end="onDragEnd" />
    <main id="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import StarsCanvas from './components/common/StarsCanvas.vue'
import Sidebar from './components/common/Sidebar.vue'

const sidebarPosition = ref('left')
provide('sidebarPosition', sidebarPosition)

// Тип перетаскиваемой вкладки (для подсветки drop-зон)
const draggingType = ref(null)
provide('draggingType', draggingType)

const onDragStart = (type) => {
  draggingType.value = type
}

const onDragEnd = () => {
  draggingType.value = null
}
</script>