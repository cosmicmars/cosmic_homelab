<template>
  <div class="widget-grid-wrapper">
    <GridLayout
      v-model:layout="layout"
      :col-num="12"
      :row-height="30"
      :is-draggable="true"
      :is-resizable="true"
      :vertical-compact="true"
      :margin="[10, 10]"
      :use-css-transforms="true"
      :max-rows="12"
      @layout-updated="onLayoutUpdated"
    >
      <GridItem
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        :min-w="3"
        :min-h="3"
        drag-allow-from=".widget-header"
      >
        <div class="widget">
          <div class="widget-header">
            <span>{{ getWidgetTitle(item.i) }}</span>
            <button class="widget-close" @click="removeWidget(item.i)">×</button>
          </div>
          <div class="widget-content">
            <!-- Здесь будет содержимое виджета в зависимости от типа -->
            <component :is="getWidgetComponent(item.i)" :widget-id="item.i" />
          </div>
        </div>
      </GridItem>
    </GridLayout>

    <!-- Панель добавления виджетов -->
    <div v-if="layout.length < maxWidgets" class="add-widget-panel">
      <button
        v-for="type in availableWidgetTypes"
        :key="type"
        @click="addWidget(type)"
        class="add-widget-btn"
      >
        Добавить {{ getWidgetTitle(type) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { GridLayout, GridItem } from 'vue-grid-layout'
import ServersWidget from './widgets/ServersWidget.vue'
import ContainersWidget from './widgets/ContainersWidget.vue'
import LogsWidget from './widgets/LogsWidget.vue'
import AlertsWidget from './widgets/AlertsWidget.vue'

const maxWidgets = 4
const availableWidgetTypes = ['servers', 'containers', 'logs', 'alerts']


// Начальный макет (можно загружать из localStorage)
const layout = ref([])

// Начальный макет (можно оставить пустым или задать предустановленный)
const defaultLayout = []

const resetLayout = () => {
  layout.value = JSON.parse(JSON.stringify(defaultLayout))
}



// Отображение заголовков
const getWidgetTitle = (type) => {
  const titles = {
    servers: 'Servers',
    containers: 'Containers',
    logs: 'Logs',
    alerts: 'Alerts'
  }
  return titles[type] || type
}

// Компоненты для каждого типа
const widgetComponents = {
  servers: ServersWidget,
  containers: ContainersWidget,
  logs: LogsWidget,
  alerts: AlertsWidget
}

const getWidgetComponent = (type) => widgetComponents[type]

// Добавление нового виджета
const addWidget = (type) => {
  if (layout.value.length >= maxWidgets) return

  // Генерируем уникальный идентификатор
  const id = `${type}-${Date.now()}`

  // Определяем начальную позицию (первое свободное место)
  // Упрощённо: ставим в конец с размерами 4x4
  const newItem = {
    i: id,
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
    type
  }

  layout.value.push(newItem)
}

// Удаление виджета
const removeWidget = (id) => {
  layout.value = layout.value.filter(item => item.i !== id)
}

// При изменении макета можно сохранять в localStorage
const onLayoutUpdated = (newLayout) => {
  // Опционально: сохраняем позиции и размеры
}

// Экспортируем метод для родителя
defineExpose({ resetLayout })
</script>

<style scoped>
.widget-grid-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vue-grid-layout {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  min-height: 400px;
}

.widget {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.widget-header {
  padding: 8px 12px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.widget-close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}
.widget-close:hover {
  color: var(--red);
}

.widget-content {
  flex: 1;
  padding: 12px;
  overflow: auto;
}

.add-widget-panel {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.add-widget-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.add-widget-btn:hover {
  background: rgba(77,230,209,0.2);
  border-color: var(--cyan);
}
</style>