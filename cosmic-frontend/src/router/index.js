import { createRouter, createWebHistory } from 'vue-router'
import { useDockerConnection } from '../composables/useDockerConnection'
import WelcomeView from '../views/WelcomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import ServersView from '../views/ServersView.vue'
import ContainersView from '../views/ContainersView.vue'
import LogsView from '../views/LogsView.vue'
import ApiCardsView from '../views/ApiCardsView.vue'
import MetricsView from '../views/MetricsView.vue'

const routes = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome', component: WelcomeView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/servers', name: 'servers', component: ServersView },
  { path: '/containers', name: 'containers', component: ContainersView },
  { path: '/logs', name: 'logs', component: LogsView },
  { path: '/api-cards', name: 'api-cards', component: ApiCardsView },
  { path: '/metrics', name: 'metrics', component: MetricsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const { isConnected } = useDockerConnection()
  const publicPages = ['/welcome']
  const authRequired = !publicPages.includes(to.path)

  if (authRequired && !isConnected.value) {
    next({ path: '/welcome', query: { reason: 'no_connection' } })
  } else {
    next()
  }
})

export default router