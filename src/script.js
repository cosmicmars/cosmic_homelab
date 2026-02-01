function drawSmoothArea(canvas, color) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = {
        top: 6,
        right: 0,
        bottom: 0,
        left: 0
    };

    const cw = w - padding.left - padding.right;
    const ch = h - padding.top - padding.bottom;

    const points = Array.from({ length: 16 }, (_, i) =>
        Math.sin(i * 0.7) * 0.25 + Math.random() * 0.12 + 0.45
    );

    ctx.clearRect(0, 0, w, h);

    /* Градиент */
    const grad = ctx.createLinearGradient(0, padding.top, 0, h);
    grad.addColorStop(0, color + "aa");
    grad.addColorStop(1, color + "05");

    ctx.beginPath();
    points.forEach((p, i) => {
        const x = padding.left + (i / (points.length - 1)) * cw;
        const y = padding.top + ch - p * ch;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(x - 18, y, x, y);
    });

    ctx.lineTo(padding.left + cw, padding.top + ch);
    ctx.lineTo(padding.left, padding.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* Обводка */
    ctx.beginPath();
    points.forEach((p, i) => {
        const x = padding.left + (i / (points.length - 1)) * cw;
        const y = padding.top + ch - p * ch;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}


document.querySelectorAll(".card").forEach(card => {
    const canvas = card.querySelector("canvas");
    const color = getComputedStyle(card).getPropertyValue("--accent").trim();
    drawSmoothArea(canvas, color);
});

function drawBigChart() {
    const canvas = document.getElementById("bigChart");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = { top: 10, right: 10, bottom: 24, left: 36 };
    const cw = w - padding.left - padding.right;
    const ch = h - padding.top - padding.bottom;

    const data = Array.from({ length: 40 }, (_, i) =>
        Math.sin(i / 3) * 25 + 45 + Math.random() * 6
    );

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#9aa0aa";
    ctx.font = "12px Inter";

    [0, 30, 60, 90].forEach(v => {
        const y = padding.top + ch - (v / 90) * ch;
        ctx.fillText(v, 6, y + 4);
    });

    /* Градиент! */
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h);
    gradient.addColorStop(0, "#4de6d155");
    gradient.addColorStop(1, "#4de6d105");

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = padding.left + (i / (data.length - 1)) * cw;
        const y = padding.top + ch - (v / 90) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.lineTo(padding.left + cw, padding.top + ch);
    ctx.lineTo(padding.left, padding.top + ch);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    /* обводка ждя хуйни маленькой */
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = padding.left + (i / (data.length - 1)) * cw;
        const y = padding.top + ch - (v / 90) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#4de6d1";
    ctx.lineWidth = 2.5;
    ctx.stroke();
}

/* э бля тут вывод вролд */
window.addEventListener("load", drawBigChart);
window.addEventListener("resize", drawBigChart);

function redrawMiniCharts() {
    document.querySelectorAll(".card").forEach(card => {
        const canvas = card.querySelector("canvas");
        const color = getComputedStyle(card)
            .getPropertyValue("--accent")
            .trim();

        drawSmoothArea(canvas, color);
    });
}

window.addEventListener("resize", redrawMiniCharts);

document.querySelectorAll(".card").forEach(card => {
    const controls = card.querySelector(".card-controls");
    if (!controls) return;

    const startBtn = controls.querySelector(".start");
    const stopBtn = controls.querySelector(".stop");
    const restartBtn = controls.querySelector(".restart");

    function setStatus(status) {
        controls.dataset.status = status;
    }

    startBtn.addEventListener("click", e => {
        e.stopPropagation();
        setStatus("running");
    });

    stopBtn.addEventListener("click", e => {
        e.stopPropagation();
        setStatus("stopped");
    });

    restartBtn.addEventListener("click", e => {
        e.stopPropagation();
        setStatus("stopped");

        setTimeout(() => {
            setStatus("running");
        }, 600);
    });
});
