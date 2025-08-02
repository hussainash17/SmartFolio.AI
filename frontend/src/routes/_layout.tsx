import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import MobileLayout from "@/components/Mobile/MobileLayout"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <MobileLayout>
      <Outlet />
    </MobileLayout>
  )
}

export default Layout
