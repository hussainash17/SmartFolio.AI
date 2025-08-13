import { createFileRoute } from "@tanstack/react-router"
import { PortfolioDashboard } from "@/components/Trading/PortfolioDashboard"

export const Route = createFileRoute("/_layout/portfolio")({
  component: Portfolio,
})

function Portfolio() {
  return <PortfolioDashboard />
} 