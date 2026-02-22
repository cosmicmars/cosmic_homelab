import { servers } from "./services/servers.js";
import { startAutoUpdate, stopAutoUpdate } from "./services/apiUpdater.js";

/* INIT DOM */
document.addEventListener("DOMContentLoaded", () => {
    initServerModal();
});

/* serv */
function initServerModal() {
    const modal = document.getElementById("serverModal");
    const list = document.getElementById("serverList");
    const openBtn = document.getElementById("openServerModal");
    const applyBtn = document.getElementById("applyServers");

    const serversContainer = document.getElementById("serversContainer");
    const bigChartContainer = document.getElementById("bigChartContainer");

    let selectedServerId = null;

    const colorMap = {
        cyan: "#4de6d1",
        green: "#7be495",
        red: "#ff6b6b"
    };

    /* модалка */
    openBtn.onclick = () => {
        modal.classList.remove("hidden");
        renderList();
    };

    /* render */
    function renderList() {
        list.innerHTML = "";

        servers.forEach(server => {
            const li = document.createElement("li");

            const label = document.createElement("span");
            label.textContent = server.name;

            const checkbox = document.createElement("input");
            checkbox.type = "radio";
            checkbox.name = "server";
            checkbox.value = server.id;
            checkbox.checked = selectedServerId === server.id;

            checkbox.addEventListener("change", () => {
                selectedServerId = server.id;
                applyBtn.disabled = false;
            });

            li.addEventListener("click", () => {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change"));
            });

            li.append(label, checkbox);
            list.appendChild(li);
        });

        applyBtn.disabled = !selectedServerId;
    }

    applyBtn.onclick = () => {
        modal.classList.add("hidden");
        serversContainer.innerHTML = "";

        const server = servers.find(s => s.id === selectedServerId);
        if (!server) return;

        console.log(' applyBtn.onclick для сервера:', server.id);

        serversContainer.style.display = "flex";
        serversContainer.style.justifyContent = "center";

        const serverBlock = document.createElement("section");
        serverBlock.style.display = "grid";
        serverBlock.style.gridTemplateColumns = "1fr 1fr";
        serverBlock.style.gridTemplateRows = "1fr 1fr";
        serverBlock.style.gap = "20px";

        const cardTypes = [
            { type: "cpu", value: "0%", color: "cyan" },
            { type: "temp", value: server.temp, color: "red" },
            { type: "storage", value: server.storage, color: "green" },
            {
                type: "server",
                value: `Work - ${server.uptime}`,
                color: "green",
                name: server.name
            }
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
                if (canvas) {
                    drawSmoothArea(canvas, colorMap[ct.color]);
                }
            });
        });

        serversContainer.appendChild(serverBlock);
        serversContainer.classList.remove("hidden");
        bigChartContainer.classList.remove("hidden");

        drawBigChart();

        fetchInitialData(server.id).then(initialMetrics => {
            if (initialMetrics) {
                cpuHistory = [initialMetrics.cpu];
                updateUIText(initialMetrics);
                const cpuCanvas = document.querySelector('[data-metric="cpu"] canvas');
                if (cpuCanvas) drawSmoothArea(cpuCanvas, colorMap.cyan, cpuHistory);
                drawBigChart(cpuHistory);
            }
        });

        stopAutoUpdate();
        startAutoUpdate(server.id, updateUI);
    };

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") modal.classList.add("hidden");
    });

    modal.addEventListener("click", e => {
        if (e.target === modal) modal.classList.add("hidden");
    });
}


// коментарийййй //

let cpuHistory = [];
const MAX_HISTORY = 16;
const BIG_HISTORY = 40;

const colorMap = {
    cyan: "#4de6d1",
    green: "#7be495",
    red: "#"
};

/*  маленькие графики  */
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
    // console.log('drawSmoothArea', canvas, rect.width, rect.height, dataPoints);
}

/* большой график */
function drawBigChart(dataPoints = null) {
    const canvas = document.getElementById("bigChart");
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

    let data;
    if (dataPoints && dataPoints.length > 0) {
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

// рендер комент!! //
async function fetchInitialData(serverId) {
    console.log(`🔄 fetchInitialData для ${serverId}`);
    const baseUrl = "http://127.0.0.1:8000";
    try {
        const cpuPromise = fetch(`${baseUrl}/container/${serverId}/cpu`)
            .then(res => {
                if (!res.ok) throw new Error(`CPU status ${res.status}`);
                return res.json();
            });
        const uptimePromise = fetch(`${baseUrl}/container/${serverId}/uptime`)
            .then(res => {
                if (!res.ok) throw new Error(`Uptime status ${res.status}`);
                return res.json();
            });
        const ipPromise = fetch(`${baseUrl}/container/${serverId}/ip`)
            .then(res => {
                if (!res.ok) throw new Error(`IP status ${res.status}`);
                return res.json();
            });

        const [cpuData, uptimeData, ipData] = await Promise.all([cpuPromise, uptimePromise, ipPromise]);

        console.log(' fetchInitialData выполнился для:', cpuData, uptimeData, ipData);
        return {
            cpu: cpuData.cpu_percent,
            uptime: uptimeData.uptime,
            ip: ipData,
            containerId: serverId
        };
    } catch (err) {
        console.error(' fetchInitialData ошибка:', err);
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
    console.log(' updateUI вызван с metrics:', metrics);
    updateUIText(metrics);

    if (typeof metrics.cpu === 'number') {
        cpuHistory.push(metrics.cpu);
        if (cpuHistory.length > MAX_HISTORY) cpuHistory.shift();

        const cpuCanvas = document.querySelector('[data-metric="cpu"] canvas');
        if (cpuCanvas) drawSmoothArea(cpuCanvas, colorMap.cyan, cpuHistory);

        drawBigChart(cpuHistory);
    }
    console.log('cpuHistory', cpuHistory);
}

const button = document.getElementById("Stop");
button.addEventListener("click", function(){
    stopAutoUpdate();
    console.log('Обновление остановлено');
});