import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/research")({
  component: Research,
})

function Research() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Research & Analysis</h1>
      <p className="text-muted-foreground">Advanced research tools and market analysis coming soon...</p>
    </div>
  )
}