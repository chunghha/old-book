import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import Root from './routes/__root'
import DashboardRoute from './routes/dashboard'
import TransactionsRoute from './routes/transactions'
import AccountsRoute from './routes/accounts'
import BudgetsRoute from './routes/budgets'
import RecurringRoute from './routes/recurring'
import SettingsRoute from './routes/settings'

// Create the root route
const rootRoute = createRootRoute({
  component: Root,
})

// Create child routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardRoute,
})

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionsRoute,
})

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accounts',
  component: AccountsRoute,
})

// Sub-routes for accounts (if needed)
const accountsOperatingRoute = createRoute({
  getParentRoute: () => accountsRoute,
  path: '/operating',
  component: AccountsRoute,
})

const accountsPayrollRoute = createRoute({
  getParentRoute: () => accountsRoute,
  path: '/payroll',
  component: AccountsRoute,
})

const accountsSavingsRoute = createRoute({
  getParentRoute: () => accountsRoute,
  path: '/savings',
  component: AccountsRoute,
})

const budgetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/budgets',
  component: BudgetsRoute,
})

const recurringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurring',
  component: RecurringRoute,
})

// Placeholder routes that redirect to dashboard
const cashFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cash-flow',
  component: DashboardRoute,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: DashboardRoute,
})

const approvalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/approvals',
  component: DashboardRoute,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
})

// Create the route tree
const routeTree = rootRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  accountsRoute.addChildren([
    accountsOperatingRoute,
    accountsPayrollRoute,
    accountsSavingsRoute,
  ]),
  budgetsRoute,
  recurringRoute,
  cashFlowRoute,
  analyticsRoute,
  approvalsRoute,
  settingsRoute,
])

// Create the router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}