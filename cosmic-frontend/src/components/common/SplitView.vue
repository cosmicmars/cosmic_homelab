<template>
  <div class="split-view" :class="{ 'dragging': draggingType }">
    <div v-if="panels.length === 0 && draggingType" class="empty-drop-zone" @drop.prevent="onDropEmpty" @dragover.prevent>
      Перетащите сюда
    </div>
    <template v-else>
      <template v-for="(panel, index) in panels" :key="panel.id">
        <NodeView
          :node="wrapPanel(panel)"
          :dragging-type="draggingType"
          :total-leaves="panels.length"
          :style="getPanelStyle(panel)"
          @add-panel="handleAddPanel"
          @close="handleClose"
          @resize="(size) => handleResize({ panelId: panel.id, newSize: size })"
        />
        <div
          v-if="index < panels.length - 1"
          class="resizer horizontal"
          @mousedown="startResize($event, index)"
        ></div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import NodeView from './NodeView.vue'

const props = defineProps({
  modelValue: { type: Array, required: true }, // плоский массив панелей
  draggingType: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue'])

const panels = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const totalLeaves = computed(() => panels.value.length)

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const startResize = (e, index) => {
  e.preventDefault()
  const startX = e.clientX
  const panel1 = panels.value[index]
  const panel2 = panels.value[index + 1]
  const startSize1 = panel1.size
  const startSize2 = panel2.size

  const onMouseMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX
    const containerWidth = e.currentTarget.parentNode.clientWidth
    const deltaPercent = (dx / containerWidth) * 100

    let newSize1 = startSize1 + deltaPercent
    let newSize2 = startSize2 - deltaPercent

    newSize1 = Math.max(10, Math.min(90, newSize1))
    newSize2 = 100 - newSize1 // сумма должна быть 100

    const updatedPanels = [...panels.value]
    updatedPanels[index] = { ...panel1, size: newSize1 }
    updatedPanels[index + 1] = { ...panel2, size: newSize2 }
    panels.value = updatedPanels
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// Оборачиваем панель в формат, который ожидает NodeView
function wrapPanel(panel) {
  return {
    type: 'leaf',
    id: panel.id,
    leafType: panel.type,
    size: panel.size
  }
}

function getPanelStyle(panel) {
  return {
    flex: `0 0 ${panel.size}%`
  }
}

// Добавление панели с указанием позиции относительно существующей
function addPanel(type, targetId, position) {
  if (panels.value.length >= 4) return

  const newPanel = {
    id: generateId(),
    type,
    size: null // временно
  }

  let newPanels = [...panels.value]

  if (newPanels.length === 0) {
    newPanel.size = 100
    newPanels = [newPanel]
  } else if (newPanels.length === 1) {
    const existing = newPanels[0]
    if (position === 'left' || position === 'right') {
      existing.size = 50
      newPanel.size = 50
      newPanels = position === 'left' ? [newPanel, existing] : [existing, newPanel]
    } else {
      // вертикальное разделение пока не поддерживаем, можно добавить позже
      existing.size = 50
      newPanel.size = 50
      newPanels = [existing, newPanel]
    }
  } else {
    // Находим индекс целевой панели
    const targetIndex = newPanels.findIndex(p => p.id === targetId)
    if (targetIndex === -1) return

    const target = newPanels[targetIndex]
    const splitRatio = 0.5 // делим поровну
    const newSize = target.size * splitRatio
    target.size = target.size - newSize
    newPanel.size = newSize

    if (position === 'left' || position === 'top') {
      newPanels.splice(targetIndex, 0, newPanel)
    } else {
      newPanels.splice(targetIndex + 1, 0, newPanel)
    }

    // Перераспределяем размеры внутри группы? Пока считаем, что остальные панели не меняют размер
    // Это упрощённо, но работает для горизонтального стека
  }

  panels.value = newPanels
}

const handleAddPanel = ({ type, targetNode, position }) => {
  addPanel(type, targetNode.id, position)
}

const handleClose = (leafId) => {
  let newPanels = panels.value.filter(p => p.id !== leafId)
  if (newPanels.length > 0) {
    const totalSize = newPanels.reduce((sum, p) => sum + p.size, 0)
    const scale = 100 / totalSize
    newPanels = newPanels.map(p => ({ ...p, size: p.size * scale }))
  }
  panels.value = newPanels
}

const handleResize = ({ panelId, newSize }) => {
  const index = panels.value.findIndex(p => p.id === panelId)
  if (index === -1) return
  const panel = panels.value[index]
  const oldSize = panel.size
  const delta = newSize - oldSize

  // Найдём соседнюю панель, с которой делим пространство
  let neighbourIndex = index + 1
  if (neighbourIndex >= panels.value.length) neighbourIndex = index - 1
  if (neighbourIndex < 0) return

  const neighbour = panels.value[neighbourIndex]
  const newNeighbourSize = neighbour.size - delta
  if (newNeighbourSize < 10 || newSize < 10) return

  const updatedPanels = [...panels.value]
  updatedPanels[index] = { ...panel, size: newSize }
  updatedPanels[neighbourIndex] = { ...neighbour, size: newNeighbourSize }
  panels.value = updatedPanels
}

const onDropEmpty = (e) => {
  const type = e.dataTransfer.getData('text/plain')
  if (!type) return
  addPanel(type, null, 'right')
}
</script>

<style scoped>
.split-view {
  width: 100%;
  height: 100%;
  display: flex;
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