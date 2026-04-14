const layout = document.getElementById('layout');
const draggables = document.querySelectorAll('.draggable');
const zones = document.querySelectorAll('.drop-zone');
let dragged = null;
const BASE_URL = 'http://localhost:8000';

    let sseSource = null;
    let pinnedCard = null;
    let pinnedOriginalIndex = -1;

    // -------------------- Переменные для автообновления метрик --------------------
    let autoUpdateInterval = null;
    let currentServerId = null;
    let updateCallback = null;

    function startAutoUpdate(serverId, callback) {
        stopAutoUpdate();
        currentServerId = serverId;
        updateCallback = callback;

        fetchMetrics(serverId).then(metrics => {
            if (metrics && updateCallback) updateCallback(metrics);
        });

        autoUpdateInterval = setInterval(async () => {
            if (currentServerId && updateCallback) {
                const metrics = await fetchMetrics(currentServerId);
                if (metrics) updateCallback(metrics);
            }
        }, 3000);
    }

    function stopAutoUpdate() {
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
        }
        currentServerId = null;
        updateCallback = null;
    }

    async function fetchMetrics(serverId) {
        try {
            const [cpuRes, uptimeRes, ipRes] = await Promise.all([
                fetch(`${BASE_URL}/container/${serverId}/cpu`),
                fetch(`${BASE_URL}/container/${serverId}/uptime`),
                fetch(`${BASE_URL}/container/${serverId}/ip`)
            ]);

            if (cpuRes.status === 404 || uptimeRes.status === 404 || ipRes.status === 404) {
                console.warn(`Контейнер ${serverId} не найден, останавливаем обновление`);
                stopAutoUpdate();
                const serversContainer = document.getElementById("serversContainer");
                if (serversContainer) {
                    serversContainer.innerHTML = `<div style="color: var(--red); text-align: center; padding: 20px;">❌ Контейнер "${serverId}" не найден. Проверьте имя контейнера.</div>`;
                }
                return null;
            }

            if (!cpuRes.ok || !uptimeRes.ok || !ipRes.ok) throw new Error('Ошибка получения данных');
            const cpuData = await cpuRes.json();
            const uptimeData = await uptimeRes.json();
            const ipData = await ipRes.json();
            return {
                cpu: cpuData.cpu_percent,
                uptime: uptimeData.uptime,
                ip: ipData,
                containerId: serverId
            };
        } catch (err) {
            console.error('fetchMetrics ошибка:', err);
            return null;
        }
    }

    // -------------------- Проверка статуса API --------------------
async function checkApiStatus() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return; // защита от отсутствия элемента
    try {
        const res = await fetch(`${BASE_URL}/`);
        const data = await res.json();
        if (data.docker) {
            statusEl.className = 'online';
            statusEl.innerHTML = '● API Online (Docker OK)';
        } else {
            statusEl.className = 'offline';
            statusEl.innerHTML = '● API Online (Docker недоступен)';
        }
    } catch (e) {
        statusEl.className = 'offline';
        statusEl.innerHTML = '● API Offline';
    }
}
    // -------------------- Эндпоинты API (карточки) --------------------
const endpoints = [
            {
                name: ' Главная',
                method: 'GET',
                path: '/',
                description: 'Проверка статуса API',
                needId: false,
                needBody: false,
                color: 'get'
            },
            {
                name: ' Список контейнеров',
                method: 'GET',
                path: '/containers',
                description: 'Все контейнеры (включая остановленные)',
                needId: false,
                needBody: false,
                color: 'get'
            },
            {
                name: ' Список образов',
                method: 'GET',
                path: '/images',
                description: 'Все Docker образы',
                needId: false,
                needBody: false,
                color: 'get'
            },
            {
                name: ' IP контейнера',
                method: 'GET',
                path: '/container/{id}/ip',
                description: 'Получить IP адреса контейнера',
                needId: true,
                needBody: false,
                placeholderId: 'test_container',
                color: 'get'
            },
            {
                name: ' CPU контейнера',
                method: 'GET',
                path: '/container/{id}/cpu',
                description: 'Использование CPU',
                needId: true,
                needBody: false,
                placeholderId: 'test_container',
                color: 'get'
            },
            {
                name: ' Uptime контейнера',
                method: 'GET',
                path: '/container/{id}/uptime',
                description: 'Время работы',
                needId: true,
                needBody: false,
                placeholderId: 'test_container',
                color: 'get'
            },
            {
                name: ' Создать контейнер',
                method: 'CRE',
                path: '/create',
                description: 'Создать новый контейнер (GET параметры)',
                needId: false,
                needBody: false,
                params: [
                    { name: 'name', placeholder: 'my_container', value: 'test_container' },
                    { name: 'image', placeholder: 'ubuntu', value: 'ubuntu' },
                    { name: 'cmd', placeholder: 'sleep 3600', value: 'sleep 3600' }
                ],
                color: 'post'
            },
            {
                name: ' Удалить контейнер',
                method: 'REM',
                path: '/remove',
                description: 'Удалить контейнер (GET параметр)',
                needId: false,
                needBody: false,
                params: [
                    { name: 'name', placeholder: 'container_name', value: 'test_container' }
                ],
                color: 'delete'
            },
            {
                name: ' Собрать данные',
                method: 'GET',
                path: '/collect/{id}',
                description: 'Собрать всю инфу о контейнере',
                needId: true,
                needBody: false,
                placeholderId: 'test_container',
                color: 'get'
            }
        ];
    // -------------------- Создание карточки API --------------------
    function createCard(ep) {
        const card = document.createElement('div');
        card.className = 'card';

        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <span class="card-title">${ep.name}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button class="pin-btn" title="Закрепить в начале">📌</button>
                <span class="badge ${ep.color}">${ep.method}</span>
            </div>
        `;
        card.appendChild(header);

        const desc = document.createElement('div');
        desc.style.fontSize = '0.85rem';
        desc.style.color = '#94a3b8';
        desc.style.marginBottom = '12px';
        desc.textContent = ep.description;
        card.appendChild(desc);

        const urlDiv = document.createElement('div');
        urlDiv.className = 'endpoint';
        urlDiv.textContent = ep.path;
        card.appendChild(urlDiv);

        const inputs = {};

        if (ep.params) {
            ep.params.forEach(param => {
                const group = document.createElement('div');
                group.className = 'param-group';
                const label = document.createElement('label');
                label.className = 'param-label';
                label.textContent = param.name + ':';
                group.appendChild(label);
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = param.placeholder;
                input.value = param.value || '';
                input.id = `input_${ep.path}_${param.name}`;
                group.appendChild(input);
                card.appendChild(group);
                inputs[param.name] = input;
            });
        } else if (ep.needId) {
            const group = document.createElement('div');
            group.className = 'param-group';
            const label = document.createElement('label');
            label.className = 'param-label';
            label.textContent = 'Container ID:';
            group.appendChild(label);
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = ep.placeholderId || 'Введите container ID';
            input.value = ep.placeholderId || '';
            input.id = `input_${ep.path}_id`;
            group.appendChild(input);
            card.appendChild(group);
            inputs.id = input;
        }

        if (ep.needBody) {
            const group = document.createElement('div');
            group.className = 'param-group';
            const label = document.createElement('label');
            label.className = 'param-label';
            label.textContent = 'JSON Body:';
            group.appendChild(label);
            const textarea = document.createElement('textarea');
            textarea.placeholder = '{}';
            textarea.value = ep.placeholderBody || '{\n  "key": "value"\n}';
            textarea.id = `body_${ep.path}`;
            group.appendChild(textarea);
            card.appendChild(group);
            inputs.body = textarea;
        }

        const button = document.createElement('button');
        button.innerHTML = '🚀 Отправить запрос';
        card.appendChild(button);

        const responseDiv = document.createElement('div');
        responseDiv.className = 'response';
        card.appendChild(responseDiv);

        button.addEventListener('click', async () => {
            let url = BASE_URL + ep.path;
            const queryParams = new URLSearchParams();

            if (ep.params) {
                Object.keys(inputs).forEach(key => {
                    if (key !== 'body') queryParams.append(key, inputs[key].value);
                });
                url += '?' + queryParams.toString();
            } else if (ep.needId && inputs.id) {
                url = url.replace('{id}', inputs.id.value);
            }

            responseDiv.style.display = 'block';
            responseDiv.innerHTML = `<div class="response-header"><span>⏳ Выполняется...</span><span class="status pending">Pending</span></div>`;

            try {
                const options = { method: ep.method, headers: { 'Content-Type': 'application/json' } };
                if (inputs.body) {
                    try {
                        JSON.parse(inputs.body.value);
                        options.body = inputs.body.value;
                    } catch (e) {
                        responseDiv.innerHTML = `<div class="response-header"><span>❌ Ошибка</span><span class="status error">Invalid JSON</span></div><div class="response-body"><pre>Тело запроса должно быть валидным JSON</pre></div>`;
                        return;
                    }
                }

                const startTime = Date.now();
                const res = await fetch(url, options);
                const time = Date.now() - startTime;
                let data;
                const contentType = res.headers.get('content-type');
                if (contentType?.includes('application/json')) data = await res.json();
                else data = await res.text();

                responseDiv.innerHTML = `
                    <div class="response-header">
                        <span>📦 Ответ (${time}ms)</span>
                        <span class="status ${res.ok ? 'success' : 'error'}">${res.status} ${res.statusText}</span>
                    </div>
                    <div class="response-body">
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    </div>
                `;
            } catch (error) {
                responseDiv.innerHTML = `<div class="response-header"><span>❌ Ошибка сети</span><span class="status error">Failed</span></div><div class="response-body"><pre>${error.message}</pre></div>`;
            }
        });

        return card;
    }

    function renderCards() {
        const grid = document.getElementById('cardsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        endpoints.forEach(ep => grid.appendChild(createCard(ep)));
    }

    // -------------------- Анимация перемещения (FLIP) --------------------
    function flipMove(card, targetGrid, newIndex) {
        const firstRect = card.getBoundingClientRect();
        if (newIndex === 0) targetGrid.prepend(card);
        else {
            const children = Array.from(targetGrid.children);
            if (newIndex < children.length) targetGrid.insertBefore(card, children[newIndex]);
            else targetGrid.appendChild(card);
        }
        const lastRect = card.getBoundingClientRect();
        const dx = firstRect.left - lastRect.left;
        const dy = firstRect.top - lastRect.top;
        card.style.transform = `translate(${dx}px, ${dy}px)`;
        card.classList.add('moving');
        requestAnimationFrame(() => {
            card.style.transition = 'transform 0.4s ease';
            card.style.transform = '';
        });
        const onTransitionEnd = () => {
            card.classList.remove('moving');
            card.style.transition = '';
            card.removeEventListener('transitionend', onTransitionEnd);
        };
        card.addEventListener('transitionend', onTransitionEnd);
    }

    document.getElementById('cardsGrid')?.addEventListener('click', (e) => {
        const pinBtn = e.target.closest('.pin-btn');
        if (!pinBtn) return;
        const card = pinBtn.closest('.card');
        const grid = document.getElementById('cardsGrid');
        if (!grid) return;

        if (pinnedCard === card) {
            card.classList.remove('pinned');
            const targetIndex = pinnedOriginalIndex;
            pinnedCard = null;
            pinnedOriginalIndex = -1;
            flipMove(card, grid, targetIndex);
            return;
        }

        if (pinnedCard) {
            pinnedCard.classList.remove('pinned');
            const oldCard = pinnedCard;
            const oldIndex = pinnedOriginalIndex;
            pinnedCard = null;
            pinnedOriginalIndex = -1;
            flipMove(oldCard, grid, oldIndex);
        }

        const currentChildren = Array.from(grid.children);
        const currentIndex = currentChildren.indexOf(card);
        card.classList.add('pinned');
        pinnedCard = card;
        pinnedOriginalIndex = currentIndex;
        flipMove(card, grid, 0);
    });

    // -------------------- SSE --------------------
    function setupSSE() {
        const sseContainer = document.getElementById('sseContainerId');
        const streamDiv = document.getElementById('sseStream');
        const startBtn = document.getElementById('startSseBtn');
        const stopBtn = document.getElementById('stopSseBtn');
        if (!sseContainer || !streamDiv || !startBtn || !stopBtn) return;

        startBtn.addEventListener('click', () => {
            if (sseSource) sseSource.close();
            const containerId = sseContainer.value.trim();
            if (!containerId) {
                alert('Введите container ID');
                return;
            }
            streamDiv.innerHTML = '<div style="color: #3b82f6;">🔄 Подключение к SSE...</div>';
            sseSource = new EventSource(`${BASE_URL}/sse/container/${containerId}/uptime`);
            sseSource.onopen = () => streamDiv.innerHTML = '<div style="color: #10b981;">✅ SSE подключено</div>';
            sseSource.onmessage = (event) => {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'sse-message';
                const time = new Date().toLocaleTimeString();
                let data = event.data;
                try { data = JSON.stringify(JSON.parse(data), null, 2); } catch(e) {}
                msgDiv.innerHTML = `<span class="timestamp">[${time}]</span> <pre style="display: inline; color: #bbd7fb;">${data}</pre>`;
                streamDiv.appendChild(msgDiv);
                while (streamDiv.children.length > 10) streamDiv.removeChild(streamDiv.firstChild);
                streamDiv.scrollTop = streamDiv.scrollHeight;
            };
            sseSource.onerror = () => {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'sse-message';
                errorDiv.style.color = '#b91c1c';
                errorDiv.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ❌ Ошибка соединения`;
                streamDiv.appendChild(errorDiv);
                if (sseSource.readyState === EventSource.CLOSED) {
                    sseSource.close();
                    sseSource = null;
                }
            };
        });
        stopBtn.addEventListener('click', () => {
            if (sseSource) {
                sseSource.close();
                sseSource = null;
                const msgDiv = document.createElement('div');
                msgDiv.className = 'sse-message';
                msgDiv.style.color = '#b45309';
                msgDiv.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ⏹ SSE остановлен`;
                streamDiv.appendChild(msgDiv);
            }
        });
    }

    // -------------------- Метрики серверов, графики --------------------
    const colorMap = {
        cyan: "#4de6d1",
        green: "#7be495",
        red: "#ff6b6b"
    };
    let cpuHistory = [];
    const MAX_HISTORY = 16;

function drawSmoothArea(canvas, color, dataPoints = null) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    let points;
    if (dataPoints && dataPoints.length > 0) {
        const maxVal = Math.max(...dataPoints, 1);
        points = dataPoints.map(v => (v / maxVal) * 0.8 + 0.1);
    } else {
        points = Array(16).fill(0.2);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + "aa");
    grad.addColorStop(1, color + "05");

    ctx.beginPath();
    points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - p * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

    function drawBigChart(dataPoints = null) {
        const canvas = document.getElementById("bigChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const w = rect.width, h = rect.height;
        ctx.clearRect(0, 0, w, h);
        let data;
        if (dataPoints && dataPoints.length) {
            const maxVal = Math.max(...dataPoints, 1);
            data = dataPoints.map(v => (v / (maxVal || 100)) * 0.8 + 0.1);
        } else {
            data = Array(40).fill(0.3);
        }
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#4de6d155");
        grad.addColorStop(1, "#4de6d105");
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - v * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#4de6d1";
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    async function fetchInitialData(serverId) {
        console.log(`🔄 fetchInitialData для ${serverId}`);
        try {
            const [cpuRes, uptimeRes, ipRes] = await Promise.all([
                fetch(`${BASE_URL}/container/${serverId}/cpu`),
                fetch(`${BASE_URL}/container/${serverId}/uptime`),
                fetch(`${BASE_URL}/container/${serverId}/ip`)
            ]);
            if (!cpuRes.ok || !uptimeRes.ok || !ipRes.ok) throw new Error("Ошибка получения данных");
            const cpuData = await cpuRes.json();
            const uptimeData = await uptimeRes.json();
            const ipData = await ipRes.json();
            return {
                cpu: cpuData.cpu_percent,
                uptime: uptimeData.uptime,
                ip: ipData,
                containerId: serverId
            };
        } catch (err) {
            console.error('fetchInitialData ошибка:', err);
            return null;
        }
    }

    function updateUIText(metrics) {
        const cpuCard = document.querySelector('[data-metric="cpu"] .h');
        if (cpuCard) cpuCard.textContent = `${metrics.cpu.toFixed(2)}%`;
        const uptimeCard = document.querySelector('[data-metric="server"] .value');
        if (uptimeCard) uptimeCard.textContent = `Uptime: ${metrics.uptime}`;
    }

    function updateUI(metrics) {
        console.log('updateUI', metrics);
        updateUIText(metrics);
        if (typeof metrics.cpu === 'number') {
            cpuHistory.push(metrics.cpu);
            if (cpuHistory.length > MAX_HISTORY) cpuHistory.shift();
            const cpuCanvas = document.querySelector('[data-metric="cpu"] canvas');
            if (cpuCanvas) drawSmoothArea(cpuCanvas, colorMap.cyan, cpuHistory);
            drawBigChart(cpuHistory);
        }
    }

    // -------------------- Модалка выбора сервера (динамическая) --------------------
    async function initServerModal() {
    const modal = document.getElementById("serverModal");
    const list = document.getElementById("serverList");
    const openBtn = document.getElementById("openServerModal");
    const applyBtn = document.getElementById("applyServers");
    const serversContainer = document.getElementById("serversContainer");
    const bigChartContainer = document.getElementById("bigChartContainer");
    if (!modal || !list || !openBtn || !applyBtn || !serversContainer || !bigChartContainer) return;

    let selectedContainerId = null;

    openBtn.onclick = async () => {
        // Загружаем список контейнеров при открытии
        await loadContainersList();
        modal.classList.remove("hidden");
    };

    async function loadContainersList() {
        try {
            const res = await fetch(`${BASE_URL}/containers`);
            if (!res.ok) {
                console.error(`Ошибка загрузки контейнеров: ${res.status} ${res.statusText}`);
                list.innerHTML = `<li style="color: var(--red);">Ошибка загрузки: ${res.status}</li>`;
                return;
            }
            const containers = await res.json();
            console.log('Загружены контейнеры:', containers);
            renderList(containers);
        } catch (err) {
            console.error('Ошибка загрузки контейнеров:', err);
            list.innerHTML = '<li style="color: var(--red);">Ошибка загрузки контейнеров</li>';
        }
    }

    function renderList(containers) {
        list.innerHTML = "";
        if (!containers || !containers.length) {
            list.innerHTML = '<li style="color: var(--muted);">Нет доступных контейнеров</li>';
            applyBtn.disabled = true;
            return;
        }

        containers.forEach(container => {
            const li = document.createElement("li");
            const label = document.createElement("span");

            // Берём имя из поля name (как в логах) или обрезаем ID
            let displayName = container.name || (container.Id ? container.Id.substring(0, 12) : 'Unknown');
            displayName = displayName.replace(/^\//, '');
            label.textContent = displayName;

            const containerId = container.id; // было container.Id

            // Создаём радио-кнопку
            const checkbox = document.createElement("input");
            checkbox.type = "radio";
            checkbox.name = "server";
            checkbox.value = containerId;
            checkbox.checked = selectedContainerId === containerId;

            checkbox.addEventListener("change", () => {
                selectedContainerId = containerId;
                applyBtn.disabled = false;
                console.log('✅ Выбран контейнер:', containerId);
            });

            li.addEventListener("click", () => {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change"));
            });

            li.append(label, checkbox);
            list.appendChild(li);
        });

        applyBtn.disabled = !selectedContainerId;
    }

    applyBtn.onclick = async () => {
        console.log('🔘 Кнопка нажата, selectedContainerId =', selectedContainerId);
        modal.classList.add("hidden");
        if (!selectedContainerId) {
            console.warn('⚠️ Контейнер не выбран, выход');
        return;
    }
        modal.classList.add("hidden");
        if (!selectedContainerId) return;

        serversContainer.innerHTML = "";
        serversContainer.style.display = "flex";
        serversContainer.style.justifyContent = "center";

        // Создаём карточки метрик (без локальных данных, только заглушки)
        const serverBlock = document.createElement("section");
        serverBlock.style.display = "grid";
        serverBlock.style.gridTemplateColumns = "1fr 1fr";
        serverBlock.style.gridTemplateRows = "1fr 1fr";
        serverBlock.style.gap = "20px";

        const cardTypes = [
            { type: "cpu", value: "0%", color: "cyan" },
            { type: "temp", value: "—", color: "red" },      // временно нет данных
            { type: "storage", value: "—", color: "green" }, // временно нет данных
            { type: "server", value: `Work - ...`, color: "green", name: selectedContainerId.substring(0, 12) }
        ];

        cardTypes.forEach(ct => {
            const card = document.createElement("div");
            card.className = `card ${ct.color}`;
            card.dataset.metric = ct.type;
            if (ct.type === "server") {
                card.innerHTML = `
                    <div class="card-controls" data-status="running">
                        <span class="status-dot"></span>
                        <div class="actions">
                            <button class="btn start">▶</button>
                            <button class="btn stop">■</button>
                            <button class="btn restart">↻</button>
                        </div>
                    </div>
                    <h4 class="h-serv">${ct.name}</h4>
                    <div class="value">${ct.value}</div>
                    <canvas></canvas>
                `;
            } else {
                card.innerHTML = `<h4 class="h">${ct.value}</h4><canvas></canvas>`;
            }
            serverBlock.appendChild(card);
            requestAnimationFrame(() => {
                const canvas = card.querySelector('canvas');
                if (canvas) drawSmoothArea(canvas, colorMap[ct.color]);
            });
        });

        serversContainer.appendChild(serverBlock);
        serversContainer.classList.remove("hidden");
        bigChartContainer.classList.remove("hidden");
        drawBigChart();

        // Загружаем реальные метрики для выбранного контейнера
        const initialMetrics = await fetchInitialData(selectedContainerId);
        if (initialMetrics) {
            cpuHistory = [initialMetrics.cpu];
            updateUIText(initialMetrics);
            const cpuCanvas = document.querySelector('[data-metric="cpu"] canvas');
            if (cpuCanvas) drawSmoothArea(cpuCanvas, colorMap.cyan, cpuHistory);
            drawBigChart(cpuHistory);
        } else {
            serversContainer.innerHTML = `<div style="color: var(--red); text-align: center; padding: 20px;">❌ Не удалось загрузить данные для контейнера "${selectedContainerId.substring(0, 12)}"</div>`;
        }

        stopAutoUpdate();
        startAutoUpdate(selectedContainerId, updateUI);
    };

    document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.add("hidden"); });
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
}

    // -------------------- Инициализация --------------------
    document.addEventListener("DOMContentLoaded", () => {
        checkApiStatus();
        renderCards();
        setupSSE();
        setInterval(checkApiStatus, 10000);
        initServerModal();

        const stopBtn = document.getElementById("Stop");
        if (stopBtn) {
            stopBtn.addEventListener("click", () => {
                stopAutoUpdate();
                console.log('Обновление остановлено');
            });
        }
    });

// 🚀 DRAG START / END
draggables.forEach(el => {
    el.addEventListener('dragstart', (e) => {
        dragged = el;

        // 👇 важно для браузера
        e.dataTransfer.setData('text/plain', '');

        layout.classList.add('layout-dragging');
        setTimeout(() => el.classList.add('dragging'), 0);
    });

    el.addEventListener('dragend', () => {
        layout.classList.remove('layout-dragging');
        el.classList.remove('dragging');
        dragged = null;
    });
});

// 🎯 DROP ZONES
zones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault(); // 👈 КРИТИЧНО
        zone.classList.add('hover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('hover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();

        zone.classList.remove('hover');

        if (dragged) {
            zone.appendChild(dragged);
        }
    });
});