<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.type}`]"
      @click="remove(toast.id)"
    >
      <span class="toast-message">{{ toast.message }}</span>
      <button class="toast-close">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

const add = (message, type = 'info', duration = 4000) => {
  const id = nextId++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

const remove = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

defineExpose({ add, remove })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  min-width: 280px;
  max-width: 400px;
  padding: 14px 20px;
  border-radius: 10px;
  background: rgba(18, 20, 24, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  animation: slideIn 0.3s ease;
  transition: opacity 0.2s;
}

.toast:hover {
  opacity: 0.9;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}
.toast-success {
  border-left: 4px solid var(--green);
}
.toast-warning {
  border-left: 4px solid #f59e0b;
}
.toast-error {
  border-left: 4px solid var(--red);
}

.toast-message {
  color: white;
  font-size: 0.95rem;
}

.toast-close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.toast-close:hover {
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>