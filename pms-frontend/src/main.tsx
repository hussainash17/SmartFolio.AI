import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App'
import '../styles/globals.css'
import { OpenAPI } from './client'

// Configure API client to existing backend
OpenAPI.BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
OpenAPI.WITH_CREDENTIALS = true

// Attach token automatically if present
OpenAPI.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('portfoliomax_token');
  if (token) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
  }
  return config
})

OpenAPI.interceptors.response.use(async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('portfoliomax_token')
  }
  return response
})

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)



