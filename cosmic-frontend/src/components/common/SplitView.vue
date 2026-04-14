<template>
  <div class="split-view" :class="{ 'dragging': draggingType }">
    <template v-for="(panel, index) in modelValue" :key="panel.id">
      <NodeView
        :panel="panel"
        :dragging-type="draggingType"
        :total-panels="modelValue.length"
        :index="index"
        :is-last="index === modelValue.length - 1"
        @add-panel="handleAddPanel"
        @close="handleClose"
        @resize-start="onResizeStart"
      />
    </template>
    <div v-if="modelValue.length === 0 && draggingType" class="empty-drop-zone" @drop.prevent="onDropEmpty" @dragover.prevent>
      Перетащите сюда
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'
import NodeView from './NodeView.vue'

const props = defineProps({
  modelValue: { type: Array, required: true },
  draggingType: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const MAX_PANELS = 4

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function redistributeSizes(panels) {
  const count = panels.length
  if (count === 0) return panels
  const equalSize = 100 / count
  return panels.map(p => ({ ...p, size: equalSize }))
}

const handleAddPanel = ({ type, targetId, position }) => {
  if (props.modelValue.length >= MAX_PANELS) return

  const targetIndex = props.modelValue.findIndex(p => p.id === targetId)
  if (targetIndex === -1) return

  const newPanel = {
    id: generateId(),
    type,
    size: null
  }

  let newPanels = [...props.modelValue]
  const insertIndex = (position === 'left' || position === 'top') ? targetIndex : targetIndex + 1
  newPanels.splice(insertIndex, 0, newPanel)
  newPanels = redistributeSizes(newPanels)
  emit('update:modelValue', newPanels)
}

const handleClose = (panelId) => {
  if (props.modelValue.length <= 1) return
  let newPanels = props.modelValue.filter(p => p.id !== panelId)
  newPanels = redistributeSizes(newPanels)
  emit('update:modelValue', newPanels)
}

const onDropEmpty = (e) => {
  const type = e.dataTransfer.getData('text/plain')
  if (!type) return
  emit('update:modelValue', [{ id: generateId(), type, size: 100 }])
}

let resizing = false
let panel1 = null
let panel2 = null
let startSize1 = 0
let startSize2 = 0
let startCoord = 0
let containerSize = 0
let isHorizontal = true

const onResizeStart = ({ index, direction }) => {
  if (index < 0 || index >= props.modelValue.length - 1) return
  panel1 = props.modelValue[index]
  panel2 = props.modelValue[index + 1]
  if (!panel1 || !panel2) return

  isHorizontal = (direction === 'horizontal')
  resizing = true

  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
}

const onResizeMove = (e) => {
  if (!resizing || !panel1 || !panel2) return

  const container = document.querySelector('.split-view')
  if (!container) return
  const rect = container.getBoundingClientRect()
  containerSize = isHorizontal ? rect.width : rect.height

  const currentCoord = isHorizontal ? e.clientX : e.clientY
  if (startCoord === 0) {
    startCoord = currentCoord
    startSize1 = panel1.size
    startSize2 = panel2.size
    return
  }

  const delta = currentCoord - startCoord
  const deltaPercent = (delta / containerSize) * 100

  let newSize1 = startSize1 + deltaPercent
  let newSize2 = startSize2 - deltaPercent

  newSize1 = Math.max(10, Math.min(90, newSize1))
  newSize2 = Math.max(10, Math.min(90, newSize2))

  const newPanels = props.modelValue.map(p => {
    if (p.id === panel1.id) return { ...p, size: newSize1 }
    if (p.id === panel2.id) return { ...p, size: newSize2 }
    return p
  })
  emit('update:modelValue', newPanels)
}

const onResizeEnd = () => {
  resizing = false
  startCoord = 0
  panel1 = panel2 = null
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
}

onBeforeUnmount(() => {
  if (resizing) {
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', onResizeEnd)
  }
})
</script>

<style scoped>
.split-view {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}
.empty-drop-zone {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(77, 230, 209, 0.05);
  border: 2px dashed var(--cyan);
  color: var(--cyan);
  font-size: 18px;
}
</style>