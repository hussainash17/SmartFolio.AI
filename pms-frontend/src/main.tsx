import React from 'react'
import {createRoot} from 'react-dom/client'
import App from '../App'
import '../styles/globals.css'
import {OpenAPI} from './client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

// Configure API client to existing backend
OpenAPI.BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
OpenAPI.WITH_CREDENTIALS = true

// Set TOKEN for React Query enabled checks - CRITICAL!
OpenAPI.TOKEN = localStorage.getItem('portfoliomax_token') as any

OpenAPI.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('portfoliomax_token');
    if (token) {
        config.headers = {...(config.headers || {}), Authorization: `Bearer ${token}`}
    }
    return config
})

// Add response interceptor to handle 401
OpenAPI.interceptors.response.use(async (response) => {
    if (response.status === 401) {
        localStorage.removeItem('portfoliomax_token')
        OpenAPI.TOKEN = undefined
    }
    return response
})

// Create a shared QueryClient with reasonable defaults
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
        mutations: {
            retry: 0,
        },
    },
})

const rootEl = document.getElementById('root')!
createRoot(rootEl).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App/>
            <ReactQueryDevtools initialIsOpen={false}/>
        </QueryClientProvider>
    </React.StrictMode>
)



