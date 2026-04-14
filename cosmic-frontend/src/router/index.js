import { createRouter, createWebHistory } from 'vue-router'
import { useDockerConnection } from '../composables/useDockerConnection'
import WelcomeView from '../views/WelcomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import ServersView from '../views/ServersView.vue'
import ContainersView from '../views/ContainersView.vue'
import AlertsView from '../views/AlertsView.vue'
import LogsView from '../views/LogsView.vue'
import ApiCardsView from '../views/ApiCardsView.vue'
import MetricsView from '../views/MetricsView.vue'

const routes = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome', component: WelcomeView },
  { path: '/dashboard', component: DashboardView },
  { path: '/servers', component: ServersView },
  { path: '/containers', component: ContainersView },
  { path: '/alerts', component: AlertsView },
  { path: '/logs', component: LogsView },
  { path: '/api-cards', component: ApiCardsView },
  { path: '/metrics', component: MetricsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const { isConnected } = useDockerConnection()
  const publicPages = ['/welcome']
  const authRequired = !publicPages.includes(to.path)

  console.log(`Guard: ${to.path}, connected = ${isConnected.value}`)

  if (authRequired && !isConnected.value) {
    next({ path: '/welcome', query: { reason: 'no_connection' } })
  } else {
    next()
  }
})

export default router