from typing import Optional
import docker
import uvicorn
from dotenv.main import with_warn_for_invalid_lines
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware  # Важно!
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
import yaml
import datetime
import time
import psutil
import json
import httpx
import asyncio
import platform
from io import BytesIO
import tempfile
from docker.types import LogConfig

with open('config.yaml', 'r', encoding='utf-8') as file:
    load_yaml = yaml.safe_load(file)

BASE_URL = load_yaml['server']['host']
DATA_FILE = Path("data.json")
print(load_yaml['ui']['welcome_ascii'])
client = docker.from_env()

app = FastAPI()

HOSTS_FILE = Path("hosts.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
active_host = None

def switch_docker_client(host_url: str):
    global client, active_host
    try:
        new_client = docker.DockerClient(base_url=host_url)
        new_client.ping()
        client = new_client
        active_host = host_url
        return True
    except Exception as e:
        print(f"Failed to switch to {host_url}: {e}")
        return False

def check_docker():
    global client
    if not client:
        client = find_docker()
    if not client:
        raise HTTPException(status_code=503, detail="Docker недоступен")

def load_hosts_config():
    if HOSTS_FILE.exists():
        try:
            with HOSTS_FILE.open("r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except json.JSONDecodeError:
            return []
    return []

def save_hosts_config(hosts):
    with HOSTS_FILE.open("w", encoding="utf-8") as f:
        json.dump(hosts, f, ensure_ascii=False, indent=2)

def get_host_info(host_config):
    name = host_config.get('name', 'Unnamed')
    url = host_config.get('url', '')
    is_local = url.startswith('unix://') or url.startswith('npipe://') or 'localhost' in url or '127.0.0.1' in url

    info = {
        'id': host_config.get('id', name.lower().replace(' ', '_')),
        'name': name,
        'url': url,
        'online': False,
        'os': 'unknown',
        'memory_total': 0,
        'memory_used': 0,
        'local': is_local
    }

    try:
        test_client = docker.DockerClient(base_url=url)
        test_client.ping()
        info['online'] = True

        docker_info = test_client.info()
        info['os'] = docker_info.get('OperatingSystem', platform.system())
        mem_total = docker_info.get('MemTotal', 0)
        if mem_total:
            info['memory_total'] = round(mem_total / (1024**3), 2)

        if is_local:
            mem = psutil.virtual_memory()
            info['memory_used'] = round(mem.used / (1024**3), 2)
        else:
            info['memory_used'] = 0
    except Exception as e:
        print(f"Host {name} unavailable: {e}")

    return info

@app.get("/detect-docker")
def detect_docker():
    detected_client = find_docker()
    if detected_client:
        if platform.system() == "Windows":
            url = "npipe:////./pipe/docker_engine"
        else:
            url = "unix:///var/run/docker.sock"
        return {"url": url, "os": platform.system()}
    else:
        raise HTTPException(status_code=503, detail="Docker not found")

@app.post("/connect")
async def connect_to_host(host_url: str):
    success = switch_docker_client(host_url)
    if not success:
        raise HTTPException(status_code=400, detail="Could not connect to Docker host")
    return {"status": "connected", "host": host_url}

@app.post("/container/{container_id}/start")
def start_container(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        c.start()
        return {"status": "started", "id": container_id}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/container/{container_id}/stop")
def stop_container(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        c.stop()
        return {"status": "stopped", "id": container_id}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/container/{container_id}")
def remove_container_by_id(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        c.remove(force=True)
        return {"status": "removed", "id": container_id}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")


@app.get("/hosts")
def get_hosts():
    hosts_config = load_hosts_config()
    return [get_host_info(h) for h in hosts_config]

@app.post("/hosts")
async def add_host(host: dict):
    if not host.get('name') or not host.get('url'):
        raise HTTPException(status_code=400, detail="Name and URL are required")
    host['id'] = host['name'].lower().replace(' ', '_')
    hosts = load_hosts_config()
    hosts.append(host)
    save_hosts_config(hosts)
    return {"status": "added", "host": host}

@app.delete("/hosts/{host_id}")
async def delete_host(host_id: str):
    hosts = load_hosts_config()
    new_hosts = [h for h in hosts if h.get('id') != host_id]
    if len(new_hosts) == len(hosts):
        raise HTTPException(status_code=404, detail="Host not found")
    save_hosts_config(new_hosts)
    return {"status": "deleted"}

@app.get("/sse/events")
async def stream_events(request: Request):
    async def generate():
        client = docker.from_env()
        for event in client.events(decode=True):
            if await request.is_disconnected():
                break
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0)  # даём возможность прерваться

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

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

@app.post("/build")
def build_image(image_name: str, dockerfile: str = Body(..., media_type="text/plain")):
    image_name = image_name.strip()
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "Dockerfile"), "w") as f:
                f.write(dockerfile)
            
            image, _ = client.images.build(path=tmpdir, rm=True, forcerm=True)
            
            image.tag(image_name)
            
        return {"status": "built", "image_id": image.short_id, "image_name": image_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/run")
def run_container(image_name: str, container_name: str, cmd: str = None):
    image_name = image_name.strip()
    container_name = container_name.strip()
    try:
        command = cmd.split() if cmd else None
        
        # Принудительно ставим читаемый драйвер логов
        log_cfg = LogConfig(type=LogConfig.types.JSON)
        
        c = client.containers.run(
            image_name, 
            command, 
            name=container_name, 
            detach=True,
            log_config=log_cfg # <--- добавили сюда
        )
        return {"status": "running", "container_id": c.short_id, "container_name": container_name}
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

@app.post("/images/run")
def run_container_from_image(image: str, name: Optional[str] = None, cmd: str = ""):
    check_docker()
    try:
        if not name:
            safe_image = image.replace(':', '-').replace('/', '-')
            name = f"{safe_image}-{int(time.time())}"
        command = cmd.split() if cmd else None
        container = client.containers.run(image, command, name=name, detach=True)
        return {"status": "started", "id": container.short_id, "name": name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/images/{image_name}")
def remove_image(image_name: str):
    check_docker()
    try:
        client.images.remove(image_name)
        return {"status": "removed", "image": image_name}
    except docker.errors.ImageNotFound:
        raise HTTPException(status_code=404, detail="Image not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
        if days: parts.append(f"{days}d")
        if hours: parts.append(f"{hours}h")
        if minutes: parts.append(f"{minutes}m")
        if seconds or not parts: parts.append(f"{seconds}s")
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
            result[name] = [{"label": e.label or "", "current": e.current} for e in entries]
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
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/sse/container/{container_id}/cpu")
async def stream_cpu(container_id: str, request: Request):
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
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/sse/container/{container_id}/logs")
async def stream_logs(container_id: str, request: Request):
    async def generate():
        container = docker.from_env().containers.get(container_id)
        for log_line in container.logs(stream=True, follow=True, timestamps=True):
            if await request.is_disconnected():
                break
            yield f"data: {log_line.decode('utf-8').rstrip()}\n\n"
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)