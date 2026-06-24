import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { initializeApp } from '@/bootstrap'

// Initialize Application
initializeApp()

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
