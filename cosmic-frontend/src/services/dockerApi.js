const BASE_URL = 'http://localhost:8000'

export { removeImage as deleteImage };


export async function checkApiStatus() {
  const res = await fetch(`${BASE_URL}/`)
  return res.json()
}

export function createEventsEventSource() {
  return new EventSource(`${BASE_URL}/sse/events`)
}

export async function fetchContainerStats(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/stats?stream=false`)
  return res.json()
}

export async function addHost(host) {
  const res = await fetch(`${BASE_URL}/hosts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(host)
  })
  if (!res.ok) throw new Error('Failed to add host')
  return res.json()
}

export async function runImage(image, options = {}) {
  const params = new URLSearchParams({ image })
  if (options.name) params.append('name', options.name)
  if (options.cmd) params.append('cmd', options.cmd)
  const res = await fetch(`${BASE_URL}/images/run?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to run container')
  return res.json()
}


export async function removeImage(imageName) {
  const res = await fetch(`${BASE_URL}/images/${encodeURIComponent(imageName)}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to remove image')
  return res.json()
}

export async function deleteHost(hostId) {
  const res = await fetch(`${BASE_URL}/hosts/${hostId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete host')
  return res.json()
}

export async function fetchContainers() {
  const res = await fetch(`${BASE_URL}/containers`)
  return res.json()
}

export async function fetchImages() {
  const res = await fetch(`${BASE_URL}/images`)
  return res.json()
}

export async function fetchContainerIp(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/ip`)
  return res.json()
}

export async function fetchContainerCpu(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/cpu`)
  return res.json()
}

export async function fetchContainerUptime(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/uptime`)
  return res.json()
}

export async function fetchContainerMetrics(containerId) {
  const [cpu, uptime, ip] = await Promise.all([
    fetchContainerCpu(containerId),
    fetchContainerUptime(containerId),
    fetchContainerIp(containerId)
  ])
  return { cpu: cpu.cpu_percent, uptime: uptime.uptime, ip }
}

export async function createContainer(name, image = 'ubuntu', cmd = 'sleep 3600') {
  const res = await fetch(`${BASE_URL}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, image, cmd })
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to create container')
  }
  return res.json()
}

export async function removeContainer(name) {
  const res = await fetch(`${BASE_URL}/remove/${name}`, { method: 'DELETE' })
  return res.json()
}

export async function collectContainerData(containerId) {
  const res = await fetch(`${BASE_URL}/collect/${containerId}`)
  return res.json()
}

export async function fetchHosts() {
  const res = await fetch(`${BASE_URL}/hosts`)
  if (!res.ok) throw new Error('Failed to fetch hosts')
  return res.json()
}

export async function connectToHost(hostUrl) {
  const params = new URLSearchParams({ host_url: hostUrl })
  const res = await fetch(`${BASE_URL}/connect?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error('Connection failed')
  return res.json()
}

export function createUptimeEventSource(containerId) {
  return new EventSource(`${BASE_URL}/sse/container/${containerId}/uptime`)
}

export function createCpuEventSource(containerId) {
  return new EventSource(`${BASE_URL}/sse/container/${containerId}/cpu`)
}

export function createLogsEventSource(containerId) {
  return new EventSource(`${BASE_URL}/sse/container/${containerId}/logs`)
}

export async function sendApiRequest(endpoint, idValue, params = {}) {
  let url = BASE_URL + endpoint.path
  if (endpoint.needId && idValue) {
    url = url.replace('{id}', idValue).replace('{name}', idValue)
  }

  const options = { method: endpoint.method }
  
  // Если есть параметры и метод GET, добавляем в URL
  if (Object.keys(params).length > 0) {
    if (endpoint.method === 'GET') {
      const query = new URLSearchParams(params).toString()
      url += '?' + query
    } else {
      // Для POST/PUT можно передать в теле
      options.headers = { 'Content-Type': 'application/json' }
      options.body = JSON.stringify(params)
    }
  }

  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function startContainer(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/start`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start container')
  return res.json()
}

export async function stopContainer(containerId) {
  const res = await fetch(`${BASE_URL}/container/${containerId}/stop`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to stop container')
  return res.json()
}