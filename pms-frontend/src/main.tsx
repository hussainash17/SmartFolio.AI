import React from 'react'
import {createRoot} from 'react-dom/client'
import App from '../App'
import '../styles/globals.css'
import {OpenAPI} from './client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

// Initialize theme on app load
function initializeTheme() {
  const root = window.document.documentElement;
  const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
  
  let theme: "light" | "dark" = "light";
  
  if (stored === "system" || !stored) {
    // Use system preference
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else if (stored === "dark") {
    theme = "dark";
  } else {
    theme = "light";
  }
  
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

// Initialize theme before React renders
initializeTheme();

// Configure API client to existing backend
// Dynamically detect backend URL based on how the frontend is accessed
function getBackendUrl(): string {
    // Check if VITE_API_URL is explicitly set (for production builds)
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) {
        return envUrl;
    }
    
    // Get the hostname from the current page
    const hostname = window.location.hostname;
    
    // If accessed from localhost or 127.0.0.1, use localhost for backend
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        return 'http://localhost:8000';
    }
    
    // If accessed from a different machine (via IP), use the same hostname with port 8000
    return `http://${hostname}:8000`;
}

OpenAPI.BASE = getBackendUrl();
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



