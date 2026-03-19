from xxlimited_35 import Null

import docker
import uvicorn
from dotenv.main import with_warn_for_invalid_lines
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware  # Важно!
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
import yaml
import datetime
import time
import psutil
import json
from pathlib import Path
import httpx
import asyncio
import platform

with open('config.yaml', 'r', encoding='utf-8') as file:
    load_yaml = yaml.safe_load(file)

BASE_URL = load_yaml['server']['host']
DATA_FILE = Path("data.json")
print(load_yaml['ui']['welcome_ascii'])

app = FastAPI()

# ✅ ПРАВИЛЬНАЯ настройка CORS - только это, без ручного middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники (для разработки)
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы (GET, POST, DELETE и т.д.)
    allow_headers=["*"],  # Разрешаем все заголовки
    expose_headers=["*"],
)


client = None

def save_data(data: dict):
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def find_docker():
    """Поиск Docker сокета для разных ОС"""
    if platform.system() == "Windows":
        try:
            return docker.from_env()
        except:
            return None
    
    paths = [
        "/var/run/docker.sock",
        str(Path.home() / "Library/Containers/com.docker.docker/Data/docker.sock"),
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
    try:
        c = client.containers.get(container_id)
        networks = c.attrs["NetworkSettings"]["Networks"]
        return {net: data.get("IPAddress", "No IP") for net, data in networks.items()}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")

@app.get("/create")
def create_container(name: str, image: str = "ubuntu", cmd: str = "sleep 3600"):
    check_docker()
    try:
        try:
            client.images.get(image)
        except:
            client.images.pull(image)
        
        c = client.containers.run(image, cmd.split(), name=name, detach=True)
        return {"status": "created", "id": c.short_id, "name": name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/remove/{name}")
def remove_container(name: str):
    check_docker()
    try:
        c = client.containers.get(name)
        c.remove(force=True)
        return {"status": "removed", "name": name}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")

def _get_cpu_percent(container, interval: float = 1.0) -> float:
    if container.status != "running":
        return 0.0
    
    try:
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
    except:
        return 0.0

@app.get("/container/{container_id}/cpu")
def get_cpu(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        cpu_percent = _get_cpu_percent(c, interval=0.5)
        return {"cpu_percent": round(cpu_percent, 2)}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")

@app.get("/container/{container_id}/uptime")
def get_uptime(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        if c.status != "running":
            return {"uptime": "0s", "status": c.status}
        
        info = c.attrs
        started_at = info["State"].get("StartedAt")
        if not started_at:
            return {"uptime": "unknown"}
        
        # Парсим время
        if started_at.endswith("Z"):
            started_at = started_at[:-1] + "+00:00"
        
        if "." in started_at:
            date_part, rest = started_at.split(".", 1)
            if "+" in rest:
                frac, tz = rest.split("+", 1)
                frac = frac[:6]
                started_at = f"{date_part}.{frac}+{tz}"
            else:
                started_at = date_part
        
        started_dt = datetime.datetime.fromisoformat(started_at)
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
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")

@app.get("/host/temperature")
def get_host_temperature():
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return {"message": "Temperature sensors not available"}
        
        result = {}
        for name, entries in temps.items():
            result[name] = [
                {"label": e.label or "", "current": e.current}
                for e in entries
            ]
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/collect/{container_id}")
async def collect_via_api(container_id: str):
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client_http:
        try:
            home_data = await client_http.get("/")
            images = await client_http.get("/images")
            ips = await client_http.get(f"/container/{container_id}/ip")
            cpu = await client_http.get(f"/container/{container_id}/cpu")
            uptime = await client_http.get(f"/container/{container_id}/uptime")
            
            data = {
                "home": home_data.json() if home_data.status_code == 200 else {"error": "Failed"},
                "images": images.json() if images.status_code == 200 else [],
                "container_id": container_id,
                "container_ip": ips.json() if ips.status_code == 200 else {},
                "container_cpu": cpu.json() if cpu.status_code == 200 else {},
                "container_uptime": uptime.json() if uptime.status_code == 200 else {},
            }
            
            save_data(data)
            return data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/sse/container/{container_id}/uptime")
async def stream_uptime(container_id: str, request: Request):
    async def generate():
        while not await request.is_disconnected():
            try:
                data = get_uptime(container_id)
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Access-Control-Allow-Origin": "*",  # Явно добавляем CORS для SSE
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/sse/container/{container_id}/cpu")
async def stream_uptime(container_id: str, request: Request):
    async def generate():
        while not await request.is_disconnected():
            try:
                datacpu = get_cpu(container_id)
                yield f"data: {json.dumps(datacpu, ensure_ascii=False)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Access-Control-Allow-Origin": "*",  # Явно добавляем CORS для SSE
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=1366)