        const BASE_URL = 'http://localhost:8000';
        let sseSource = null;
        let pinnedCard = null;
        let pinnedOriginalIndex = -1;

        async function checkApiStatus() {
            const statusEl = document.getElementById('apiStatus');
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
                        if (key !== 'body') {
                            queryParams.append(key, inputs[key].value);
                        }
                    });
                    url += '?' + queryParams.toString();
                } else if (ep.needId && inputs.id) {
                    url = url.replace('{id}', inputs.id.value);
                }

                responseDiv.style.display = 'block';
                responseDiv.innerHTML = `
                    <div class="response-header">
                        <span>⏳ Выполняется...</span>
                        <span class="status pending">Pending</span>
                    </div>
                `;

                try {
                    const options = {
                        method: ep.method,
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    };

                    if (inputs.body) {
                        try {
                            JSON.parse(inputs.body.value);
                            options.body = inputs.body.value;
                        } catch (e) {
                            responseDiv.innerHTML = `
                                <div class="response-header">
                                    <span>❌ Ошибка</span>
                                    <span class="status error">Invalid JSON</span>
                                </div>
                                <div class="response-body">
                                    <pre>Тело запроса должно быть валидным JSON</pre>
                                </div>
                            `;
                            return;
                        }
                    }

                    const startTime = Date.now();
                    const res = await fetch(url, options);
                    const time = Date.now() - startTime;
                    
                    let data;
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await res.json();
                    } else {
                        data = await res.text();
                    }

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
                    responseDiv.innerHTML = `
                        <div class="response-header">
                            <span>❌ Ошибка сети</span>
                            <span class="status error">Failed</span>
                        </div>
                        <div class="response-body">
                            <pre>${error.message}</pre>
                        </div>
                    `;
                }
            });

            return card;
        }

        function renderCards() {
            const grid = document.getElementById('cardsGrid');
            grid.innerHTML = '';
            endpoints.forEach(ep => {
                grid.appendChild(createCard(ep));
            });
        }

        function flipMove(card, targetGrid, newIndex) {
            const firstRect = card.getBoundingClientRect();
            if (newIndex === 0) {
                targetGrid.prepend(card);
            } else {
                const children = Array.from(targetGrid.children);
                if (newIndex < children.length) {
                    targetGrid.insertBefore(card, children[newIndex]);
                } else {
                    targetGrid.appendChild(card);
                }
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
        document.getElementById('cardsGrid').addEventListener('click', (e) => {
            const pinBtn = e.target.closest('.pin-btn');
            if (!pinBtn) return;

            const card = pinBtn.closest('.card');
            const grid = document.getElementById('cardsGrid');

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

        function setupSSE() {
            const sseContainer = document.getElementById('sseContainerId');
            const streamDiv = document.getElementById('sseStream');
            const startBtn = document.getElementById('startSseBtn');
            const stopBtn = document.getElementById('stopSseBtn');

            startBtn.addEventListener('click', () => {
                if (sseSource) {
                    sseSource.close();
                }

                const containerId = sseContainer.value.trim();
                if (!containerId) {
                    alert('Введите container ID');
                    return;
                }

                streamDiv.innerHTML = '<div style="color: #3b82f6;">🔄 Подключение к SSE...</div>';
                
                sseSource = new EventSource(`${BASE_URL}/sse/container/${containerId}/uptime`);
                
                sseSource.onopen = () => {
                    streamDiv.innerHTML = '<div style="color: #10b981;">✅ SSE подключено</div>';
                };
                
                sseSource.onmessage = (event) => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'sse-message';
                    
                    const time = new Date().toLocaleTimeString();
                    let data = event.data;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        data = JSON.stringify(jsonData, null, 2);
                    } catch (e) {
                    }
                    
                    msgDiv.innerHTML = `<span class="timestamp">[${time}]</span> <pre style="display: inline; color: #bbd7fb;">${data}</pre>`;
                    
                    streamDiv.appendChild(msgDiv);
                    while (streamDiv.children.length > 10) {
                        streamDiv.removeChild(streamDiv.firstChild);
                    }
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
        
        checkApiStatus();
        renderCards();
        setupSSE();

        setInterval(checkApiStatus, 10000);