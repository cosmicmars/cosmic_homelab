<template>
  <div class="cards-grid">
    <div v-for="ep in endpoints" :key="ep.path" class="card">
      <div class="card-header">
        <span class="card-title">{{ ep.name }}</span>
        <span class="badge" :class="ep.color">{{ ep.method }}</span>
      </div>
      <p class="card-desc">{{ ep.description }}</p>
      <div class="endpoint">{{ ep.path }}</div>

      <!-- Поля ввода -->
      <div v-if="ep.params">
        <div v-for="param in ep.params" :key="param.name" class="param-group">
          <label>{{ param.name }}</label>
          <input v-model="paramValues[ep.path + param.name]" :placeholder="param.placeholder" />
        </div>
      </div>
      <div v-else-if="ep.needId" class="param-group">
        <label>Container ID</label>
        <input v-model="containerIds[ep.path]" :placeholder="ep.placeholderId" />
      </div>

      <button @click="sendRequest(ep)">Отправить запрос</button>

      <div v-if="responses[ep.path]" class="response">
        <div class="response-header">
          <span>📦 Ответ ({{ responses[ep.path].time }}ms)</span>
          <span :class="['status', responses[ep.path].ok ? 'success' : 'error']">
            {{ responses[ep.path].status }}
          </span>
        </div>
        <pre>{{ responses[ep.path].data }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const BASE_URL = 'http://localhost:8000'

const endpoints = [
  {
    name: 'Главная',
    method: 'GET',
    path: '/',
    description: 'Проверка статуса API',
    needId: false,
    color: 'get'
  },
  {
    name: 'Список контейнеров',
    method: 'GET',
    path: '/containers',
    description: 'Все контейнеры (включая остановленные)',
    needId: false,
    color: 'get'
  },
  {
    name: 'Список образов',
    method: 'GET',
    path: '/images',
    description: 'Все Docker образы',
    needId: false,
    color: 'get'
  },
  {
    name: 'IP контейнера',
    method: 'GET',
    path: '/container/{id}/ip',
    description: 'Получить IP адреса контейнера',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'CPU контейнера',
    method: 'GET',
    path: '/container/{id}/cpu',
    description: 'Использование CPU',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'Uptime контейнера',
    method: 'GET',
    path: '/container/{id}/uptime',
    description: 'Время работы',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'Создать контейнер',
    method: 'CRE',
    path: '/create',
    description: 'Создать новый контейнер (GET параметры)',
    needId: false,
    params: [
      { name: 'name', placeholder: 'my_container', value: 'test_container' },
      { name: 'image', placeholder: 'ubuntu', value: 'ubuntu' },
      { name: 'cmd', placeholder: 'sleep 3600', value: 'sleep 3600' }
    ],
    color: 'post'
  },
  {
    name: 'Удалить контейнер',
    method: 'REM',
    path: '/remove',
    description: 'Удалить контейнер (GET параметр)',
    needId: false,
    params: [
      { name: 'name', placeholder: 'container_name', value: 'test_container' }
    ],
    color: 'delete'
  },
  {
    name: 'Собрать данные',
    method: 'GET',
    path: '/collect/{id}',
    description: 'Собрать всю инфу о контейнере',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  }
]

const paramValues = reactive({})
const containerIds = reactive({})
const responses = reactive({})

endpoints.forEach(ep => {
  if (ep.params) {
    ep.params.forEach(p => {
      paramValues[ep.path + p.name] = p.value || ''
    })
  } else if (ep.needId) {
    containerIds[ep.path] = ep.placeholderId || ''
  }
})

async function sendRequest(ep) {
  let url = BASE_URL + ep.path
  const queryParams = new URLSearchParams()

  if (ep.params) {
    ep.params.forEach(p => {
      const val = paramValues[ep.path + p.name]
      if (val) queryParams.append(p.name, val)
    })
    url += '?' + queryParams.toString()
  } else if (ep.needId) {
    url = url.replace('{id}', containerIds[ep.path])
  }

  const startTime = Date.now()
  try {
    const res = await fetch(url, { method: ep.method })
    const time = Date.now() - startTime
    const contentType = res.headers.get('content-type')
    let data = contentType?.includes('application/json') ? await res.json() : await res.text()
    responses[ep.path] = {
      ok: res.ok,
      status: `${res.status} ${res.statusText}`,
      time,
      data: JSON.stringify(data, null, 2)
    }
  } catch (error) {
    responses[ep.path] = {
      ok: false,
      status: 'Network Error',
      time: Date.now() - startTime,
      data: error.message
    }
  }
}
</script>

<style scoped>
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.card-title {
  font-weight: 600;
  font-size: 1.1rem;
}

.card-desc {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 8px 0;
}

.endpoint {
  font-family: monospace;
  background: rgba(0,0,0,0.3);
  padding: 4px 8px;
  border-radius: 6px;
  margin: 8px 0;
}

.param-group {
  margin: 8px 0;
}
.param-group label {
  display: block;
  font-size: 0.8rem;
  color: var(--muted);
}
.param-group input {
  width: 100%;
  padding: 6px 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: white;
}

.badge {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}
.badge.get { background: #4de6d155; color: var(--cyan); }
.badge.post { background: #7be49555; color: var(--green); }
.badge.delete { background: #ff6b6b55; color: var(--red); }

.response {
  margin-top: 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 8px;
}
.response-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.status.success { color: var(--green); }
.status.error { color: var(--red); }
pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.8rem;
}
</style>