<template>
  <div
    class="split-pane"
    :style="{ flex: `0 0 ${panel.size}%` }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="pane-header">
      <span>{{ panel.type }}</span>
      <button class="pane-close" @click.stop="emit('close', panel.id)">×</button>
    </div>
    <div class="pane-content">
      <component :is="getComponent(panel.type)" />
    </div>

    <div v-if="draggingType && totalPanels < 4" class="drop-zones">
      <div class="drop-zone left" @drop.prevent="(e) => onDropZone(e, 'left')" @dragover.prevent></div>
      <div class="drop-zone right" @drop.prevent="(e) => onDropZone(e, 'right')" @dragover.prevent></div>
      <div class="drop-zone top" @drop.prevent="(e) => onDropZone(e, 'top')" @dragover.prevent></div>
      <div class="drop-zone bottom" @drop.prevent="(e) => onDropZone(e, 'bottom')" @dragover.prevent></div>
    </div>

    <div
      v-if="!isLast"
      class="resizer"
      :class="resizerClass"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ServersWidget from '../dashboard/widgets/ServersWidget.vue'
import ContainersWidget from '../dashboard/widgets/ContainersWidget.vue'
import LogsWidget from '../dashboard/widgets/LogsWidget.vue'
import AlertsWidget from '../dashboard/widgets/AlertsWidget.vue'
import ApiCardsWidget from '../dashboard/widgets/ApiCardsWidget.vue'
import ServerMetricsWidget from '../dashboard/widgets/ServerMetricsWidget.vue'

const props = defineProps({
  panel: { type: Object, required: true },
  draggingType: { type: String, default: null },
  totalPanels: { type: Number, required: true },
  index: { type: Number, required: true },
  isLast: { type: Boolean, default: false }
})

const emit = defineEmits(['add-panel', 'close', 'resize-start'])

const componentsMap = {
  servers: ServersWidget,
  containers: ContainersWidget,
  logs: LogsWidget,
  alerts: AlertsWidget,
  'api-cards': ApiCardsWidget,
  metrics: ServerMetricsWidget
}
const getComponent = (type) => componentsMap[type] || 'div'

const resizerClass = computed(() => 'horizontal')
const activeZone = ref(null)

const onDragOver = (e) => {
  if (!props.draggingType || props.totalPanels >= 4) {
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
  emit('add-panel', { type, targetId: props.panel.id, position })
  activeZone.value = null
}

const onDropZone = (e, position) => {
  const type = e.dataTransfer.getData('text/plain')
  if (!type) return
  emit('add-panel', { type, targetId: props.panel.id, position })
}

const startResize = (e) => {
  e.preventDefault()
  emit('resize-start', {
    index: props.index,
    direction: resizerClass.value
  })
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
.pane-close:hover { color: var(--red); }
.pane-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
  min-height: 0;
}
.resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -3px;
  width: 6px;
  background: rgba(255, 255, 255, 0.05);
  cursor: col-resize;
  z-index: 10;
  transition: background 0.2s;
}
.resizer:hover { background: var(--cyan); }
.drop-zones {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.drop-zone {
  position: absolute;
  background: rgba(77, 230, 209, 0.15);
  border: 2px dashed var(--cyan);
  pointer-events: auto;
  transition: background 0.2s;
}
.drop-zone:hover { background: rgba(77, 230, 209, 0.3); }
.drop-zone.left { left: 0; top: 0; bottom: 0; width: 30%; }
.drop-zone.right { right: 0; top: 0; bottom: 0; width: 30%; }
.drop-zone.top { left: 0; right: 0; top: 0; height: 30%; }
.drop-zone.bottom { left: 0; right: 0; bottom: 0; height: 30%; }
</style>