import { createFileRoute, createRootRoute, createRoute } from "@tanstack/react-router"
import { RootLayout } from "./layout/RootLayout"
import { DashboardPage } from "./pages/DashboardPage"
import { PortfolioPage } from "./pages/PortfolioPage"

// Root Route
export const rootRoute = createRootRoute({
  component: RootLayout,
})

// Dashboard Route
export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
})

// Portfolio Route
export const portfolioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/portfolio",
  component: PortfolioPage,
})

// Route Tree
export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  portfolioRoute,
]) 