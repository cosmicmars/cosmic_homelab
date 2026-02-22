const BASE_URL = "http://127.0.0.1:8000";

let timeoutId = null;
let currentContainerId = null;
let currentRunId = null;
let isFetching = false;
let currentCallback = null;

async function fetchMetrics(containerId, runId) {
    console.log(`🔍 fetchMetrics вызван с containerId=${containerId}, runId=${runId}, currentRunId=${currentRunId}`);

    if (currentRunId !== runId || currentContainerId !== containerId) {
        console.warn(`не рендерим устаревший запрос для ${containerId} (runId=${runId}, currentRunId=${currentRunId})`);
        return null;
    }

    try {
        const [cpuRes, uptimeRes, ipRes] = await Promise.all([
            fetch(`${BASE_URL}/container/${containerId}/cpu`),
            fetch(`${BASE_URL}/container/${containerId}/uptime`),
            fetch(`${BASE_URL}/container/${containerId}/ip`)
        ]);

        if (!cpuRes.ok || !uptimeRes.ok || !ipRes.ok) {
            throw new Error(`HTTP error: ${cpuRes.status}, ${uptimeRes.status}, ${ipRes.status}`);
        }

        const cpu = await cpuRes.json();
        const uptime = await uptimeRes.json();
        const ip = await ipRes.json();

        console.log(` fetchMetrics зарендерился ${containerId}, runId=${runId}`);
        return {
            cpu: cpu.cpu_percent,
            uptime: uptime.uptime,
            ip: ip,
            containerId: containerId,
            runId: runId // добавляем runId в данные для дополнительной проверки (опционально)
        };
    } catch (err) {
        console.error(` Ошибка при опросе контейнера ${containerId}:`, err);
        return null;
    }
}

async function poll() {
    if (!currentRunId || !currentContainerId || !currentCallback) {
        console.log(' рендер остановлен (poll завершён)');
        return;
    }

    if (isFetching) {
        console.warn(' Предыдущий запрос ещё выполняется, пропускаем этот цикл');
        scheduleNext();
        return;
    }

    isFetching = true;
    const runId = currentRunId; // фиксируем runId на момент начала запроса
    const containerId = currentContainerId;
    console.log(`рендерим ${containerId} (runId=${runId})...`);

    try {
        const data = await fetchMetrics(containerId, runId);
        // Проверяем, что за время запроса не произошло остановки или смены сервера
        if (data && currentRunId === runId && currentContainerId === containerId && currentCallback) {
            currentCallback(data);
        } else {
            console.log(` Результат устарел для ${containerId} (runId=${runId}, currentRunId=${currentRunId})`);
        }
    } catch (err) {
        console.error('Ошибка в poll:', err);
    } finally {
        isFetching = false;
        scheduleNext();
    }
}

function scheduleNext() {
    if (timeoutId) clearTimeout(timeoutId);
    if (currentRunId && currentContainerId && currentCallback) {
        timeoutId = setTimeout(poll, 3000);
    }
}

export function startAutoUpdate(containerId, callback) {
    stopAutoUpdate();

    if (!containerId) {
        console.error(' containerId не указан');
        return;
    }

    const runId = Date.now() + Math.random();
    currentRunId = runId;
    currentContainerId = containerId;
    currentCallback = callback;

    console.log(` Запускаем рендер для контейнера ${containerId} (runId=${runId})`);

    (async () => {
        const data = await fetchMetrics(containerId, runId);
        if (data && currentRunId === runId && currentContainerId === containerId && callback) {
            callback(data);
        }
        scheduleNext();
    })();
}

export function stopAutoUpdate() {
    console.log(` Останавливаем рендер для ${currentContainerId} (runId=${currentRunId})`);
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    currentContainerId = null;
    currentRunId = null;
    currentCallback = null;
    isFetching = false;
}