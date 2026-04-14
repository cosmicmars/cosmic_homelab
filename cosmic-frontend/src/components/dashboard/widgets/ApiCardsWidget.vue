<template>
  <div class="api-cards-widget">
    <div class="widget-header">
      <h3>API Endpoints</h3>
    </div>
    <div class="endpoints-table-wrapper">
      <table class="endpoints-table">
        <thead>
          <tr>
            <th>Метод</th>
            <th>Путь</th>
            <th>Описание</th>
            <th>Параметры</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ep in endpoints" :key="ep.path">
            <td>
              <span :class="['method-badge', ep.color]">{{ ep.method }}</span>
            </td>
            <td class="path">{{ ep.path }}</td>
            <td class="description">{{ ep.description }}</td>
            <td class="params">
              <template v-if="ep.params">
                <div v-for="param in ep.params" :key="param.name" class="param-input">
                  <input
                    v-model="paramValues[ep.path + '_' + param.name]"
                    type="text"
                    :placeholder="param.placeholder"
                  />
                </div>
              </template>
              <template v-else-if="ep.needId">
                <input
                  v-model="containerIds[ep.path]"
                  type="text"
                  :placeholder="ep.placeholderId || 'Container ID'"
                />
              </template>
              <span v-else class="no-params">—</span>
            </td>
            <td class="actions">
              <button @click="sendRequest(ep)" class="send-btn">🚀 Отправить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="Object.keys(responses).length" class="responses-panel">
      <div v-for="(resp, path) in responses" :key="path" class="response-item">
        <div class="response-header">
          <span class="response-path">{{ path }}</span>
          <button class="close-response" @click="delete responses[path]">✕</button>
        </div>
        <pre class="response-body">{{ resp }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { endpoints } from '../../../data/endpoints'
import { sendApiRequest } from '../../../services/dockerApi'

const containerIds = reactive({})
const paramValues = reactive({})
const responses = reactive({})

// Инициализация значений по умолчанию
endpoints.forEach(ep => {
  if (ep.needId) containerIds[ep.path] = ep.placeholderId || ''
  if (ep.params) {
    ep.params.forEach(p => {
      paramValues[ep.path + '_' + p.name] = p.value || ''
    })
  }
})

const sendRequest = async (ep) => {
  let id = containerIds[ep.path]
  // Для создания контейнера собираем параметры из формы
  if (ep.params) {
    const params = {}
    ep.params.forEach(p => {
      params[p.name] = paramValues[ep.path + '_' + p.name]
    })
    // Формируем id как объект с параметрами (можно передать в sendApiRequest отдельно)
    id = params
  }
  try {
    const data = await sendApiRequest(ep, id)
    responses[ep.path] = JSON.stringify(data, null, 2)
  } catch (e) {
    responses[ep.path] = `Error: ${e.message}`
  }
}
</script>

<style scoped>
.api-cards-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-radius: 12px;
  overflow: hidden;
}
.widget-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.widget-header h3 {
  margin: 0;
  font-weight: 600;
}
.endpoints-table-wrapper {
  flex: 1;
  overflow-y: auto;
}
.endpoints-table {
  width: 100%;
  border-collapse: collapse;
}
.endpoints-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 2;
}
.endpoints-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.method-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}
.method-badge.get { background: #3b82f6; color: white; }
.method-badge.post { background: #10b981; color: white; }
.method-badge.delete { background: #ef4444; color: white; }
.path {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--cyan);
}
.description {
  color: var(--muted);
  font-size: 0.85rem;
}
.params input {
  width: 100%;
  padding: 6px 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
}
.params input:focus {
  outline: none;
  border-color: var(--cyan);
}
.no-params {
  color: var(--muted);
}
.send-btn {
  background: rgba(77, 230, 209, 0.15);
  border: 1px solid rgba(77, 230, 209, 0.3);
  color: var(--cyan);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.send-btn:hover {
  background: rgba(77, 230, 209, 0.25);
}
.responses-panel {
  border-top: 1px solid var(--border);
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0,0,0,0.2);
}
.response-item {
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(0,0,0,0.3);
}
.response-path {
  font-family: monospace;
  color: var(--cyan);
}
.close-response {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
}
.close-response:hover {
  color: var(--red);
}
.response-body {
  margin: 0;
  padding: 12px 16px;
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>