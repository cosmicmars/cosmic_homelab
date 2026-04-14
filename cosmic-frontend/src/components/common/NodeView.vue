<template>
  <div
    class="split-pane"
    :style="paneStyle"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="pane-header">
      <span>{{ node.leafType }}</span>
      <button class="pane-close" @click.stop="emit('close', node.id)">×</button>
    </div>
    <div class="pane-content">
      <component :is="getComponent(node.leafType)" />
    </div>

    <div v-if="activeZone && draggingType && totalLeaves < 4" class="drop-zone-indicator" :class="activeZone"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ServersWidget from '../dashboard/widgets/ServersWidget.vue'
import ContainersWidget from '../dashboard/widgets/ContainersWidget.vue'
import LogsWidget from '../dashboard/widgets/LogsWidget.vue'
import AlertsWidget from '../dashboard/widgets/AlertsWidget.vue'

const props = defineProps({
  node: { type: Object, required: true },
  draggingType: { type: String, default: null },
  totalLeaves: { type: Number, required: true }
})

const emit = defineEmits(['add-panel', 'close', 'resize'])

const componentsMap = {
  servers: ServersWidget,
  containers: ContainersWidget,
  logs: LogsWidget,
  alerts: AlertsWidget
}
const getComponent = (type) => componentsMap[type] || 'div'

const activeZone = ref(null)

const paneStyle = computed(() => {
  // стиль задаётся родителем через flex, здесь ничего не делаем
  return {}
})

const onDragOver = (e) => {
  if (!props.draggingType || props.totalLeaves >= 4) {
    activeZone.value = null
    return
  }
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = rect.width
  const h = rect.height
  const threshold = 0.25
  if (x < w * threshold) activeZone.value = 'left'
  else if (x > w * (1 - threshold)) activeZone.value = 'right'
  else if (y < h * threshold) activeZone.value = 'top'
  else if (y > h * (1 - threshold)) activeZone.value = 'bottom'
  else activeZone.value = null
}

const onDragLeave = () => {
  activeZone.value = null
}

const onDrop = (e) => {
  const type = e.dataTransfer.getData('text/plain')
  if (!type) return
  const position = activeZone.value || 'right'
  emit('add-panel', { type, targetNode: props.node, position })
  activeZone.value = null
}
</script>

<style scoped>
.split-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 8px;
  overflow: hidden;
  min-width: 100px;
  min-height: 100px;
}
.pane-header {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}
.pane-close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
}
.pane-close:hover {
  color: var(--red);
}
.pane-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
.drop-zone-indicator {
  position: absolute;
  background: rgba(77, 230, 209, 0.2);
  border: 2px dashed var(--cyan);
  pointer-events: none;
  z-index: 25;
}
.drop-zone-indicator.left { left: 0; top: 0; bottom: 0; width: 30%; }
.drop-zone-indicator.right { right: 0; top: 0; bottom: 0; width: 30%; }
.drop-zone-indicator.top { left: 0; right: 0; top: 0; height: 30%; }
.drop-zone-indicator.bottom { left: 0; right: 0; bottom: 0; height: 30%; }
</style>