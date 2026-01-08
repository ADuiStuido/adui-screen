import { createApp } from 'vue'
import { createPinia } from 'pinia'

import '@/styles/normalize.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

import type { Brand } from '@adui/shared'

type UserId = Brand<string, 'UserId'>
const _x: UserId | null = null
void _x

app.mount('#app')
