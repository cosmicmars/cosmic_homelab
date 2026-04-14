<template>
  <div class="page">
    <ApiCardsWidget />
  </div>
</template>

<script setup>
import ApiCardsWidget from '../components/dashboard/widgets/ApiCardsWidget.vue'
</script>

<style scoped>
.page {
  height: 100%;
  padding: 24px;
  overflow: auto;
}
</style>