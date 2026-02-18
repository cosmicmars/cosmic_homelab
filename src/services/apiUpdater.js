const BASE_URL = "http://127.0.0.1:8000";

let intervalId = null;
let currentContainerId = null;
let currentRunId = null;

async function fetchMetrics(containerId, runId) {
    console.log(`🔍 fetchMetrics вызван с containerId=${containerId}, runId=${runId}, currentRunId=${currentRunId}, currentContainerId=${currentContainerId}`);
    
    // Проверка актуальности
    if (currentRunId !== runId || currentContainerId !== containerId) {
        console.warn(`⚠️ ПРОПУСКАЕМ устаревший запрос для ${containerId} (runId=${runId}, currentRunId=${currentRunId})`);
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

export function startAutoUpdate(containerId, callback) {
    stopAutoUpdate(); // полностью останавливаем предыдущий запуск

    if (!containerId) {
        console.error('❌ containerId не указан');
        return;
    }

    const runId = Date.now() + Math.random();
    currentRunId = runId;
    currentContainerId = containerId;

    console.log(`🚀 Запускаем обновление для контейнера ${containerId} (runId=${runId})`);

    // Первый запрос сразу
    fetchMetrics(containerId, runId).then(data => {
        console.log(`🏁 Первый запрос завершён для runId=${runId}, data=`, data);
        if (data && callback) callback(data);
    });

    intervalId = setInterval(async () => {
        console.log(`🔄 Опрашиваем ${currentContainerId} (runId=${currentRunId})...`);
        const data = await fetchMetrics(currentContainerId, currentRunId);
        if (data && callback) callback(data);
    }, 3000);
}

export function stopAutoUpdate() {
    if (intervalId) {
        console.log(`⏹️ Останавливаем интервал для ${currentContainerId} (runId=${currentRunId})`);
        clearInterval(intervalId);
        intervalId = null;
        currentContainerId = null;
        currentRunId = null;
    } else {
        console.log('⏸️ Интервал уже остановлен');
    }
}