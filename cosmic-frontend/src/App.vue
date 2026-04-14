<template>
  <StarsCanvas />
  <div id="layout" :class="{ 'sidebar-right': sidebarPosition === 'right' }">
    <Sidebar :position="sidebarPosition" @drag-start="onDragStart" @drag-end="onDragEnd" />
    <main id="main-content">
      <router-view />
    </main>
  </div>
  <ToastContainer ref="toastContainerRef" />
</template>

<script setup>
import { ref, provide } from 'vue'
import StarsCanvas from './components/common/StarsCanvas.vue'
import Sidebar from './components/common/Sidebar.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import { provideToast } from './composables/useToast'

const sidebarPosition = ref('left')
provide('sidebarPosition', sidebarPosition)

const draggingType = ref(null)
provide('draggingType', draggingType)

const { containerRef: toastContainerRef } = provideToast()

const onDragStart = (type) => {
  draggingType.value = type
}

const onDragEnd = () => {
  draggingType.value = null
}
</script>