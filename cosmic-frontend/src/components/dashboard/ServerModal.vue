<template>
  <div class="modal" :class="{ hidden: !visible }" @click.self="close">
    <div class="modal-content">
      <h3>Выберите сервер</h3>
      <ul class="server-list">
        <li v-for="c in containers" :key="c.Id" @click="select(c.Id)">
          <span>{{ c.Name || c.Id.substring(0, 12) }}</span>
          <input type="radio" name="server" :value="c.Id" v-model="selected" />
        </li>
      </ul>
      <button class="modal-apply" :disabled="!selected" @click="apply">Загрузить</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps(['visible'])
const emit = defineEmits(['update:visible', 'server-selected'])

const containers = ref([])
const selected = ref(null)

const close = () => emit('update:visible', false)

watch(() => props.visible, async (val) => {
  if (val) {
    try {
      const res = await fetch('/api/containers')
      containers.value = await res.json()
    } catch (e) {
      console.error('Ошибка загрузки контейнеров', e)
    }
  }
})

const select = (id) => { selected.value = id }

const apply = () => {
  if (selected.value) {
    emit('server-selected', selected.value)
    close()
  }
}
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: #0f141a;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  width: 320px;
}

.server-list {
  list-style: none;
  padding: 0;
  margin: 16px 0;
}

.server-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.server-list li:hover {
  background: rgba(255, 255, 255, 0.05);
}

.modal-apply {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--cyan);
  color: #000;
  font-weight: 600;
  cursor: pointer;
}

.modal-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>