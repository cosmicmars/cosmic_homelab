import { servers } from "./services/servers.js";

/*INIT DOM */
document.addEventListener("DOMContentLoaded", () => {
    initServerModal();
});

/* serv  */
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

    /* модалка  */
    openBtn.onclick = () => {
        modal.classList.remove("hidden");
        renderList();
    };

    /*  render  */
    function renderList() {
        list.innerHTML = "";

        servers.forEach(server => {
            const li = document.createElement("li");

            const label = document.createElement("span");
            label.textContent = server.name;

            const checkbox = document.createElement("input");
            checkbox.type = "radio";
            checkbox.name = "server";
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

        serversContainer.style.display = "flex";
        serversContainer.style.justifyContent = "center";

        const serverBlock = document.createElement("section");
        serverBlock.style.display = "grid";
        serverBlock.style.gridTemplateColumns = "1fr 1fr";
        serverBlock.style.gridTemplateRows = "1fr 1fr";
        serverBlock.style.gap = "20px";

        const cardTypes = [
            { type: "ram", value: server.ram, color: "cyan" },
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
                const canvas = card.querySelector("canvas");
                drawSmoothArea(canvas, colorMap[ct.color]);
            });
        });

        serversContainer.appendChild(serverBlock);
        serversContainer.classList.remove("hidden");
        bigChartContainer.classList.remove("hidden");

        setTimeout(() => {
            document
                .querySelectorAll(".server-block canvas")
                .forEach((canvas, i) => {
                    const card = canvas.closest(".card");
                    const color = card.classList.contains("cyan")
                        ? "#4de6d1"
                        : card.classList.contains("red")
                            ? "#ff6b6b"
                            : "#7be495";

                    drawSmoothArea(canvas, color);
                });

            drawBigChart();
        }, 100);
    };

    /*  закрыть модалку  */
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") modal.classList.add("hidden");
    });

    modal.addEventListener("click", e => {
        if (e.target === modal) modal.classList.add("hidden");
    });
}

/*  маленькие графики  */
function drawSmoothArea(canvas, color) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    const points = Array.from({ length: 16 }, (_, i) =>
        Math.sin(i * 0.6) * 0.25 + Math.random() * 0.15 + 0.45
    );

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
    ctx.closePath(); /*  закрытие нахуй!!( пример) */

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    console.log(canvas.width, canvas.height, canvas.getBoundingClientRect());
}

/* V ROT EBAAAAL !!!*/
function drawBigChart() {
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

    const data = Array.from({ length: 40 }, (_, i) =>
        Math.sin(i / 3) * 25 + 45 + Math.random() * 6
    );

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#4de6d155");
    grad.addColorStop(1, "#4de6d105");

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / 90) * h;
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
