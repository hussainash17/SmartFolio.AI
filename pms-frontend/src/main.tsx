import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App'
import '../styles/globals.css'
import { OpenAPI } from './client'

// Configure API client to existing backend
OpenAPI.BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
OpenAPI.WITH_CREDENTIALS = true

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)



