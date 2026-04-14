const CONFIG_URL = '/config.yaml'

export async function fetchDockerHosts() {
  const res = await fetch(CONFIG_URL)
  const text = await res.text()
  // Простейший парсинг YAML (можно заменить на библиотеку при необходимости)
  const hosts = []
  const lines = text.split('\n')
  let currentHost = null
  for (let line of lines) {
    line = line.trim()
    if (line.startsWith('- name:')) {
      if (currentHost) hosts.push(currentHost)
      currentHost = { name: line.replace('- name:', '').trim() }
    } else if (line.startsWith('url:') && currentHost) {
      currentHost.url = line.replace('url:', '').trim()
    } else if (line.startsWith('local:') && currentHost) {
      currentHost.local = line.replace('local:', '').trim().toLowerCase() === 'true'
    }
  }
  if (currentHost) hosts.push(currentHost)
  return hosts
}

export async function testHostConnection(url) {
  const res = await fetch(`${url}/`)
  return res.json()
}

export async function fetchHostInfo(url) {
  const [status, info] = await Promise.all([
    testHostConnection(url),
    fetch(`${url}/host/info`).then(r => r.json()).catch(() => ({}))
  ])
  return { status: status.docker, ...info }
}