<template>
  <aside
    id="sidebar"
    class="hed-vertical"
    :class="{ right: position === 'right', dragging: isDragging, flying: isFlying }"
    :style="sidebarStyle"
  >
    <div class="sidebar-header">
      <router-link to="/welcome" class="brand-link">
        <span class="brand">Cosmic</span>
      </router-link>
    </div>

    <nav class="nav">
      <div class="nav-group">
        <div class="nav-item nav-item--parent" @click="toggleCollapsed">
          <router-link to="/dashboard" class="nav-link" @click.stop>Dashboard</router-link>
          <button class="collapse-toggle" :class="{ collapsed: isCollapsed }" @click.stop="toggleCollapsed">
            <span class="arrow">▼</span>
          </button>
        </div>
        <div v-show="!isCollapsed" class="nav-children">
          <router-link
            v-for="item in pageNavItems"
            :key="item.type"
            :to="item.path"
            class="nav-link"
            draggable="true"
            @dragstart="onNavDragStart($event, item.type)"
            @dragend="onNavDragEnd"
            active-class="active"
          >
            {{ item.label }}
          </router-link>
        </div>
      </div>

      <div class="drag-sources">
        <div
          v-for="item in widgetNavItems"
          :key="item.type"
          class="nav-link drag-only"
          draggable="true"
          @dragstart="onNavDragStart($event, item.type)"
          @dragend="onNavDragEnd"
        >
          {{ item.label }}
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div v-if="isDragging" class="drag-tooltip">
        Перетащите на другую сторону
      </div>
      <div
        class="drag-handle"
        title="Перетащите, чтобы переместить панель"
        @mousedown="onHandleMouseDown"
      >
        <span>⋮⋮</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, inject, computed, onUnmounted } from 'vue'

const props = defineProps({
  position: { type: String, default: 'left' }
})

const emit = defineEmits(['drag-start', 'drag-end'])

const pageNavItems = [
  { type: 'servers', label: 'Servers', path: '/servers' },
  { type: 'containers', label: 'Containers', path: '/containers' },
  { type: 'logs', label: 'Logs', path: '/logs' },
  { type: 'alerts', label: 'Alerts', path: '/alerts' }
]

const widgetNavItems = [
  { type: 'api-cards', label: 'API Cards' },
  { type: 'metrics', label: 'Metrics' }
]

const isCollapsed = ref(true)

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

const onNavDragStart = (e, type) => {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', type)
  emit('drag-start', type)
}

const onNavDragEnd = () => {
  emit('drag-end')
}

const sidebarPosition = inject('sidebarPosition')

const isDragging = ref(false)
const dragOffset = ref(0)
const isFlying = ref(false)
const flyOffset = ref(0)

let startX = 0
let lastX = 0
let velocity = 0
let lastTimestamp = 0
let animationFrame = null

const sidebarStyle = computed(() => {
  if (isFlying.value) {
    return { transform: `translateX(${flyOffset.value}px)`, transition: 'none' }
  }
  if (isDragging.value) {
    return { transform: `translateX(${dragOffset.value}px)`, transition: 'none' }
  }
  return { transform: 'translateX(0)', transition: 'transform 0.3s ease-out' }
})

const onHandleMouseDown = (e) => {
  if (!e.target.closest('.drag-handle')) return
  e.preventDefault()
  isDragging.value = true
  startX = e.clientX
  lastX = e.clientX
  lastTimestamp = performance.now()
  velocity = 0

  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

const onDragMove = (e) => {
  const now = performance.now()
  const deltaTime = now - lastTimestamp
  const deltaX = e.clientX - lastX

  if (deltaTime > 0) {
    velocity = deltaX / deltaTime
  }

  const offset = e.clientX - startX
  const maxOffset = 200
  dragOffset.value = Math.max(-maxOffset, Math.min(maxOffset, offset))

  lastX = e.clientX
  lastTimestamp = now
}

const onDragEnd = () => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)

  const finalOffset = dragOffset.value
  const finalVelocity = velocity

  isDragging.value = false
  dragOffset.value = 0

  startInertiaAnimation(finalOffset, finalVelocity)
}

const startInertiaAnimation = (initialOffset, initialVelocity) => {
  isFlying.value = true
  flyOffset.value = initialOffset

  const friction = 0.92
  const threshold = 0.05
  const snapThreshold = 120

  let currentOffset = initialOffset
  let currentVelocity = initialVelocity

  const animate = () => {
    currentVelocity *= friction
    currentOffset += currentVelocity * 16

    const absVelocity = Math.abs(currentVelocity)
    const absOffset = Math.abs(currentOffset)

    if (absVelocity < threshold && absOffset < 5) {
      isFlying.value = false
      flyOffset.value = 0
      return
    }

    if (absOffset > snapThreshold) {
      const shouldSwitchRight = (currentOffset > 0 && props.position === 'left')
      const shouldSwitchLeft = (currentOffset < 0 && props.position === 'right')
      if (shouldSwitchRight || shouldSwitchLeft) {
        const targetSide = shouldSwitchRight ? 'right' : 'left'
        isFlying.value = false
        flyOffset.value = 0
        sidebarPosition.value = targetSide
        return
      }
    }

    flyOffset.value = currentOffset
    animationFrame = requestAnimationFrame(animate)
  }

  animationFrame = requestAnimationFrame(animate)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
#sidebar {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(18, 20, 24, 0.7);
  backdrop-filter: blur(8px);
  border-right: 1px solid var(--border);
  position: relative;
  will-change: transform;
  z-index: 10;
}

#sidebar.right {
  border-right: none;
  border-left: 1px solid var(--border);
}

#sidebar.dragging {
  box-shadow: 0 0 30px rgba(77, 230, 209, 0.4);
  transition: none;
}

#sidebar.flying {
  box-shadow: 0 8px 30px rgba(77, 230, 209, 0.3);
  z-index: 100;
}

.sidebar-header {
  padding: 24px 20px;
}

.brand-link {
  text-decoration: none;
  color: inherit;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px;
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
}

.nav-item--parent {
  justify-content: space-between;
}

.nav-link {
  padding: 10px 16px;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  flex: 1;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.nav-link.active {
  background: rgba(77, 230, 209, 0.15);
  color: var(--cyan);
  position: relative;
}

.nav-link.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--cyan);
  border-radius: 0 3px 3px 0;
}

.right .nav-link.active::before {
  left: auto;
  right: 0;
  border-radius: 3px 0 0 3px;
}

.drag-sources {
  margin-top: 8px;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}

.drag-only {
  cursor: grab;
  opacity: 0.8;
  background: rgba(77, 230, 209, 0.05);
  border: 1px dashed rgba(77, 230, 209, 0.3);
  margin-bottom: 4px;
  display: block;
  text-align: left;
}
.drag-only:hover {
  background: rgba(77, 230, 209, 0.15);
  opacity: 1;
}
.drag-only:active {
  cursor: grabbing;
}

.collapse-toggle {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.collapse-toggle .arrow {
  font-size: 12px;
  transition: transform 0.2s;
}

.collapse-toggle.collapsed .arrow {
  transform: rotate(-90deg);
}

.nav-children {
  display: flex;
  flex-direction: column;
  padding-left: 16px;
  margin-top: 4px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: grab;
  color: var(--muted);
  font-size: 20px;
  transition: all 0.2s;
  border: 1px solid var(--border);
  user-select: none;
}

.drag-handle:hover {
  background: rgba(77, 230, 209, 0.2);
  color: var(--cyan);
  border-color: var(--cyan);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-tooltip {
  background: rgba(0, 0, 0, 0.8);
  color: var(--cyan);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--cyan);
  backdrop-filter: blur(4px);
  white-space: nowrap;
  pointer-events: none;
  margin-bottom: 4px;
}
</style>