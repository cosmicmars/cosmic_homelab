export const endpoints = [
    {
    name: 'Создать контейнер',
    method: 'POST',
    path: '/create',
    description: 'Создать новый контейнер',
    needId: false,
    params: [
      { name: 'name', placeholder: 'my_container', value: 'test_container' },
      { name: 'image', placeholder: 'ubuntu', value: 'ubuntu' },
      { name: 'cmd', placeholder: 'sleep 3600', value: 'sleep 3600' }
    ],
    color: 'post'
  },
  {
    name: 'Главная',
    method: 'GET',
    path: '/',
    description: 'Проверка статуса API',
    needId: false,
    color: 'get'
  },
  {
    name: 'Список контейнеров',
    method: 'GET',
    path: '/containers',
    description: 'Все контейнеры',
    needId: false,
    color: 'get'
  },
  {
    name: 'Список образов',
    method: 'GET',
    path: '/images',
    description: 'Все образы',
    needId: false,
    color: 'get'
  },
  {
    name: 'IP контейнера',
    method: 'GET',
    path: '/container/{id}/ip',
    description: 'IP адреса',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'CPU контейнера',
    method: 'GET',
    path: '/container/{id}/cpu',
    description: 'Использование CPU',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'Uptime контейнера',
    method: 'GET',
    path: '/container/{id}/uptime',
    description: 'Время работы',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  },
  {
    name: 'Создать контейнер',
    method: 'POST',
    path: '/create',
    description: 'Создать (GET параметры)',
    needId: false,
    params: [
      { name: 'name', placeholder: 'my_container', value: 'test_container' },
      { name: 'image', placeholder: 'ubuntu', value: 'ubuntu' },
      { name: 'cmd', placeholder: 'sleep 3600', value: 'sleep 3600' }
    ],
    color: 'post'
  },
  {
    name: 'Удалить контейнер',
    method: 'DELETE',
    path: '/remove/{name}',
    description: 'Удалить контейнер',
    needId: true,
    placeholderId: 'test_container',
    color: 'delete'
  },
  {
    name: 'Собрать данные',
    method: 'GET',
    path: '/collect/{id}',
    description: 'Вся инфа о контейнере',
    needId: true,
    placeholderId: 'test_container',
    color: 'get'
  }
]