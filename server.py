import docker
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
import datetime
import time
import psutil
import json
from pathlib import Path
import httpx
import asyncio


BASE_URL = "http://127.0.0.1:8000"  # или твой порт/хост
DATA_FILE = Path("data.json")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:63342"],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

client = None

def save_data(data: dict):
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def find_docker():
    paths = [
        "/var/run/docker.sock",
        str(Path.home() / "Library/Containers/com.docker.docker/Data/docker.sock"),
        str(Path.home() / "Library/Containers/com.docker.docker/Data/docker.raw.sock"),
        str(Path.home() / ".docker/run/docker.sock")
    ]
    
    for path in paths:
        if os.path.exists(path):
            try:
                test = docker.DockerClient(base_url=f"unix://{path}")
                test.ping()
                return docker.DockerClient(base_url=f"unix://{path}")
            except:
                pass
    
    try:
        return docker.from_env()
    except:
        pass
    
    return None

client = find_docker()

def check_docker():
    global client
    if not client:
        client = find_docker()
    if not client:
        raise HTTPException(status_code=503, detail="Docker недоступен")

@app.get("/")
def home():
    return {"status": "ok", "docker": client is not None}

@app.get("/containers")
def get_containers():
    check_docker()
    return [{"id": c.short_id, "name": c.name, "status": c.status} 
            for c in client.containers.list(all=True)]

@app.get("/images")
def get_images():
    check_docker()
    return [img.tags[0] for img in client.images.list() if img.tags]

@app.get("/container/{container_id}/ip")
def get_ip(container_id: str):
    check_docker()
    c = client.containers.get(container_id)
    networks = c.attrs["NetworkSettings"]["Networks"]
    return {net: data.get("IPAddress", "No IP") for net, data in networks.items()}

@app.get("/create")
def create_container(name: str, image: str = "ubuntu", cmd: str = "sleep 3600"):
    check_docker()
    try:
        client.images.get(image)
    except:
        client.images.pull(image)
    
    c = client.containers.run(image, cmd.split(), name=name, detach=True)
    
    return {"status": "created", "id": c.short_id, "name": name}
@app.get("/remove")
def remove_container(name: str):
    check_docker()
    c = client.containers.get(name)
    c.remove(force=True)
    return {"status": "removed"}

def _get_cpu_percent(container, interval: float = 1.0) -> float:
    s1 = container.stats(stream=False)
    time.sleep(interval)
    s2 = container.stats(stream=False)

    cpu_delta = (
        s2["cpu_stats"]["cpu_usage"]["total_usage"]
        - s1["cpu_stats"]["cpu_usage"]["total_usage"]
    )
    system_delta = (
        s2["cpu_stats"]["system_cpu_usage"]
        - s1["cpu_stats"]["system_cpu_usage"]
    )

    if cpu_delta <= 0 or system_delta <= 0:
        return 0.0

    percpu = s2["cpu_stats"]["cpu_usage"].get("percpu_usage") or []
    num_cpus = len(percpu) or 1
    return cpu_delta / system_delta * num_cpus * 100.0


@app.get("/container/{container_id}/cpu")
def get_cpu(container_id: str):
    check_docker()
    c = client.containers.get(container_id)
    if c.status != "running":
        return {"cpu_percent": 0.0}
    cpu_percent = _get_cpu_percent(c, interval=0.5)
    return {"cpu_percent": round(cpu_percent, 2)}

@app.get("/container/{container_id}/uptime")
def get_uptime(container_id: str):
    check_docker()
    c = client.containers.get(container_id)
    info = c.attrs
    started_at = info["State"].get("StartedAt")
    if not started_at or c.status != "running":
        return {"uptime": "0s"}
    s = started_at
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    # если есть точка, режем микросекунды до 6 знаков
    if "." in s:
        date_part, rest = s.split(".", 1)      # '2026-02-05T13:46:17', '111860135+00:00'
        frac, tz = rest.split("+", 1)          # '111860135', '00:00'
        frac = frac[:6]                        # '111860'
        s = f"{date_part}.{frac}+{tz}"

    started_dt = datetime.datetime.fromisoformat(s)
    now = datetime.datetime.now(datetime.timezone.utc)
    delta = now - started_dt

    seconds = int(delta.total_seconds())
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if seconds or not parts:
        parts.append(f"{seconds}s")

    return {"uptime": " ".join(parts)}

@app.get("/host/temperature")
def get_host_temperature():
    # temps = psutil.sensors_temperatures(fahrenheit=False)
    # result = {}
    # for name, entries in temps.items():
    #     result[name] = [
    #         {"label": e.label or "", "current": e.current}
    #         for e in entries
    #     ]
    # return result
    pass

@app.get("/collect/{container_id}")
def collect_via_api(container_id: str):
    client_http = httpx.Client(base_url=BASE_URL, timeout=10.0)

    home_data = client_http.get("/").json()
    images = client_http.get("/images").json()

    cid = container_id

    ips = client_http.get(f"/container/{cid}/ip").json()
    cpu = client_http.get(f"/container/{cid}/cpu").json()
    uptime = client_http.get(f"/container/{cid}/uptime").json()

    data = {
        "home": home_data,
        "images": images,
        "container_id": cid,
        "container_ip": ips,
        "container_cpu": cpu,
        "container_uptime": uptime,
    }

    save_data(data)
    return data

# ТЕСТ ТРАНСЛЯЦИИ 

@app.get("/sse/container/{container_id}/uptime")
async def stream_uptime(container_id: str, request: Request):
    async def generate():
        while not await request.is_disconnected():
            try:
                data = get_uptime(container_id)  # твоя существующая функция
                yield f"data: {json.dumps(data)}\n\n"
            except:
                yield f"data: {json.dumps({'error': 'Ошибка'})}\n\n"
            await asyncio.sleep(2)
    
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
