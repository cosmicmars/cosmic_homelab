// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import ServersView from '../views/ServersView.vue'
import ContainersView from '../views/ContainersView.vue'
import AlertsView from '../views/AlertsView.vue'
import LogsView from '../views/LogsView.vue'

const routes = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome', name: 'welcome', component: WelcomeView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/servers', name: 'servers', component: ServersView },
  { path: '/containers', name: 'containers', component: ContainersView },
  { path: '/alerts', name: 'alerts', component: AlertsView },
  { path: '/logs', name: 'logs', component: LogsView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router