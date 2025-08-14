/**
 * Main application entry point
 * Sets up the Vue.js application with all necessary configurations
 */

import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.scss'

// Create the Vue application instance
const app = createApp(App)

// Global error handler for production
if (import.meta.env.PROD) {
  app.config.errorHandler = (error, vm, info) => {
    console.error('Global error:', error)
    console.error('Component:', vm)
    console.error('Info:', info)
    
    // You could send this to a logging service in production
    // logErrorToService(error, info)
  }
}

// Mount the application to the DOM
app.mount('#app')

// Make sure we have proper error handling for unhandled promises
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason)
  // Prevent the default browser behavior
  event.preventDefault()
})