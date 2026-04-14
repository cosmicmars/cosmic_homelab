<template>
  <div class="page">
    <ServerMetricsWidget />
  </div>
</template>

<script setup>
import ServerMetricsWidget from '../components/dashboard/widgets/ServerMetricsWidget.vue'
</script>

<style scoped>
.page {
  height: 100%;
  padding: 24px;
  overflow: auto;
}
</style>