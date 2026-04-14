<template>
  <div class="cards-grid">
    <div class="card">API карточки (заглушка)</div>
  </div>
</template>

<script setup>
// Позже перенесёшь сюда логику endpoints и запросов
</script>

<style scoped>
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  color: white;
  min-width: 200px;
}
</style>