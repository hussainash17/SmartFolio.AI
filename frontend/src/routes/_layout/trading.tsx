import { createFileRoute } from "@tanstack/react-router"
import { TradingInterface } from "@/components/Trading/TradingInterface"

export const Route = createFileRoute("/_layout/trading")({
  component: Trading,
})

function Trading() {
  return <TradingInterface />
}