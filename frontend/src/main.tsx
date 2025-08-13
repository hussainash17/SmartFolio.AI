import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChakraProvider } from "@chakra-ui/react"
import { routeTree } from "./app/routes"
import { OpenAPI } from "./client"
import "./index.css"

// Configure API client
OpenAPI.BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000"
OpenAPI.WITH_CREDENTIALS = true

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

// Create router
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
})

// Register router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Global error handler
const handleApiError = (error: any) => {
  console.error("API Error:", error)
  
  if (error?.status === 401 || error?.status === 403) {
    // Redirect to login on authentication errors
    window.location.href = "/login"
  }
}

// Set up global error handling
window.addEventListener("unhandledrejection", (event) => {
  handleApiError(event.reason)
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <RouterProvider router={router} />
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>
) 