import { createFileRoute } from "@tanstack/react-router"
import { MarketData } from "@/components/Trading/MarketData"

export const Route = createFileRoute("/_layout/market")({
  component: Market,
})

function Market() {
  return <MarketData />
}