import { createFileRoute } from "@tanstack/react-router"
import { OrdersManager } from "@/components/Trading/OrdersManager"

export const Route = createFileRoute("/_layout/orders")({
  component: Orders,
})

function Orders() {
  return <OrdersManager />
}