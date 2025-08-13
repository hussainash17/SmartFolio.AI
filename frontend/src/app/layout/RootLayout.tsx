import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "@/components/layout/Sidebar"
import { Toaster } from "@/components/ui/sonner"

export const RootLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
        <Toaster />
      </main>
    </div>
  )
} 