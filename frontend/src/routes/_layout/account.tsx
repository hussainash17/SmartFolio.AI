import { createFileRoute } from "@tanstack/react-router"
import { AccountManager } from "@/components/Trading/AccountManager"

export const Route = createFileRoute("/_layout/account")({
  component: Account,
})

function Account() {
  return <AccountManager />
}