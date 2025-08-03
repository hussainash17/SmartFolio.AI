import { createFileRoute } from "@tanstack/react-router"
import { TradingDashboard } from "@/components/Trading/TradingDashboard"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  return <TradingDashboard />
}
