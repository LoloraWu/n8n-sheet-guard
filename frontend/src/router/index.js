import { createRouter, createWebHistory } from 'vue-router'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import ReminderSettings from '../views/ReminderSettings.vue'

const routes = [
    {
        path: '/',
        redirect: '/dashboard' // Default to dashboard (show status first)
    },
    {
        path: '/register',
        name: 'Register',
        component: Register
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard
    },
    {
        path: '/reminder',
        name: 'ReminderSettings',
        component: ReminderSettings
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
