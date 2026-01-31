import docker
import uvicorn
from fastapi import FastAPI, HTTPException

app = FastAPI()

try:
    client = docker.from_env()
    # Проверка связи:
    client.ping()
    print("Успешное подключение к Docker Daemon!")
except Exception as e:
    print(f"ОШИБКА: Не могу подключиться к Docker. Проверь, запущен ли Docker Desktop.")
    print(f"Детали ошибки: {e}")
    # Если докера нет, клиент будет None, и мы обработаем это в функциях
    client = None

# --- Вспомогательная функция проверки ---
def check_docker():
    if not client:
        raise HTTPException(status_code=503, detail="Docker Daemon недоступен. Запустите Docker Desktop.")

# --- Эндпоинты ---

@app.get("/")
def home():
    return {"status": "Server is running", "docker_connected": client is not None}

@app.get("/containers")
def get_all_containers():
    check_docker()
    containers = client.containers.list(all=True)
    results = []
    for c in containers:
        results.append({
            "id": c.short_id,
            "name": c.name,
            "status": c.status,
            "image": c.image.tags[0] if c.image.tags else "no-tag"
        })
    return results

@app.get("/images")
def get_all_images():
    check_docker()
    images = client.images.list()
    # Фильтруем пустые теги
    return [img.tags[0] for img in images if img.tags]

@app.get("/container/{container_id}/ip")
def get_ip(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        # Получаем IP из настроек сети
        # Обычно он лежит в networks -> bridge -> IPAddress
        networks = c.attrs['NetworkSettings']['Networks']
        ip_info = {}
        for net_name, net_data in networks.items():
            ip_info[net_name] = net_data.get('IPAddress', 'No IP')
        return ip_info
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Контейнер не найден")

@app.get("/container/{container_id}/ram")
def get_ram(container_id: str):
    check_docker()
    try:
        c = client.containers.get(container_id)
        if c.status != 'running':
            return {"ram": "0 MB", "status": "stopped"}
            
        # stream=False дает мгновенный снимок
        stats = c.stats(stream=False)
        usage = stats['memory_stats'].get('usage', 0)
        return {"ram": f"{usage / 1024 / 1024:.2f} MB"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Контейнер не найден")

@app.get("/create")
def create_container(name: str, image: str = "ubuntu", cmd: str = "sleep 3600"):
    check_docker()
    try:
        # Проверяем наличие образа, если нет - качаем
        try:
            client.images.get(image)
        except docker.errors.ImageNotFound:
            print(f"Образ {image} не найден, скачиваю...")
            client.images.pull(image)

        # Запускаем
        c = client.containers.run(image, cmd, name=name, detach=True)
        return {"status": "created", "id": c.short_id, "name": c.name}
    except Exception as e:
        # Ошибка 400 - плохой запрос (например, имя занято)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/remove")
def remove_container(name: str):
    check_docker()
    try:
        c = client.containers.get(name)
        c.remove(force=True) # force удаляет даже запущенный
        return {"status": "removed", "name": name}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Контейнер с таким именем не найден")

if __name__ == "__main__":
    # Запуск сервера
    uvicorn.run(app, host="0.0.0.0", port=8000)