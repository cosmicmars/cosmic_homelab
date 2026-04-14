<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

const add = (message, type = 'info', duration = 3000) => {
  const id = nextId++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

const remove = (id) => {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

const success = (message, duration) => add(message, 'success', duration)
const error = (message, duration) => add(message, 'error', duration)
const warning = (message, duration) => add(message, 'warning', duration)
const info = (message, duration) => add(message, 'info', duration)
defineExpose({ success, error, warning, info, add, remove })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  min-width: 260px;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
}

.toast-success {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}
.toast-error {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}
.toast-warning {
  background: rgba(245, 158, 11, 0.9);
  color: black;
}
.toast-info {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.7;
  padding: 0 4px;
}
.toast-close:hover {
  opacity: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>