const BASE_URL = "http://127.0.0.1:8000";

let intervalId = null;
let currentContainerId = null;
let currentRunId = null;
let currentCallback = null;

/**
 * Запрашивает метрики контейнера.
 */
async function fetchMetrics(containerId, runId) {
    console.log(`🔍 fetchMetrics вызван с containerId=${containerId}, runId=${runId}, currentRunId=${currentRunId}`);

    try {
        const [cpuRes, uptimeRes, ipRes] = await Promise.all([
            fetch(`${BASE_URL}/container/${containerId}/cpu`),
            fetch(`${BASE_URL}/container/${containerId}/uptime`),
            fetch(`${BASE_URL}/container/${containerId}/ip`)
        ]);

        // Проверяем, не устарел ли запрос (runId мог измениться за время ожидания)
        if (currentRunId !== runId || currentContainerId !== containerId) {
            console.warn(`⚠️ Результат устарел для ${containerId} (runId=${runId}, currentRunId=${currentRunId})`);
            return null;
        }

        if (!cpuRes.ok || !uptimeRes.ok || !ipRes.ok) {
            throw new Error(`HTTP error: ${cpuRes.status}, ${uptimeRes.status}, ${ipRes.status}`);
        }

        const cpu = await cpuRes.json();
        const uptime = await uptimeRes.json();
        const ip = await ipRes.json();

        console.log(`✅ fetchMetrics успех для ${containerId}, runId=${runId}`);
        return {
            cpu: cpu.cpu_percent,
            uptime: uptime.uptime,
            ip: ip,
            containerId: containerId
        };
    } catch (err) {
        console.error(`❌ Ошибка при опросе контейнера ${containerId}:`, err);
        return null;
    }
}

/**
 * Запускает периодическое обновление данных.
 * Запросы выполняются каждые 3 секунды, не дожидаясь завершения предыдущих.
 * Устаревшие результаты отбрасываются по runId.
 */
export function startAutoUpdate(containerId, callback) {
    // Полностью останавливаем предыдущий запуск
    stopAutoUpdate();

    if (!containerId) {
        console.error('❌ containerId не указан');
        return;
    }

    const runId = Date.now() + Math.random();
    currentRunId = runId;
    currentContainerId = containerId;
    currentCallback = callback;

    console.log(`🚀 Запускаем обновление для контейнера ${containerId} (runId=${runId})`);

    // Функция, которая будет вызываться по интервалу
    const poll = async () => {
        // Если runId изменился (например, после остановки) – выходим
        if (currentRunId !== runId || currentContainerId !== containerId) return;

        console.log(`🔄 Опрашиваем ${containerId} (runId=${runId})...`);
        const data = await fetchMetrics(containerId, runId);
        
        // Проверяем актуальность после получения данных
        if (data && currentRunId === runId && currentContainerId === containerId && currentCallback) {
            currentCallback(data);
        }
    };

    // Первый запрос сразу
    poll();

    // Запускаем интервал
    intervalId = setInterval(poll, 3000);
}

/**
 * Останавливает обновление.
 */
export function stopAutoUpdate() {
    console.log(`⏹️ Останавливаем обновление для ${currentContainerId} (runId=${currentRunId})`);
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    currentContainerId = null;
    currentRunId = null;
    currentCallback = null;
}