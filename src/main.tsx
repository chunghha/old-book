import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // <--- CRITICAL: Loads Tailwind and base styles

/**
 * Simple manual router mount for the prototype.
 *
 * The route files export plain React components (default export). To avoid
 * the file-route machinery and duplicate-route issues, we map location paths
 * to components manually and render them inside the Root app shell.
 *
 * This keeps routing minimal and SPA-friendly for the demo environment.
 */
import Root from '../app/routes/__root'
import SettingsRoute from '../app/routes/settings'
import TransactionsRoute from '../app/routes/transactions'
// Initialize stores
import { initializeFinanceStore } from '../app/stores/finance'
import Landing from './landing'

/* Map pathname -> component */
function getComponentForPath(pathname: string) {
	// Simple normalization to handle query params if present
	const p = (pathname || '/').split('?')[0] || '/'

	switch (p) {
		case '/transactions':
			return TransactionsRoute
		case '/settings':
			return SettingsRoute
		default:
			return Landing
	}
}

/* Ensure root container exists and create the React root once */
const container = (() => {
	let el = document.getElementById('root')
	if (!el) {
		el = document.createElement('div')
		el.id = 'root'
		document.body.appendChild(el)
	}
	return el
})()

const root = createRoot(container)

/* Render function that mounts the selected route component inside the Root shell */
function mount() {
	const Component = getComponentForPath(window.location.pathname)
	root.render(
		<React.StrictMode>
			<Root>
				<Component />
			</Root>
		</React.StrictMode>,
	)
}

/* Client-side navigation helper (pushState) */
function navigate(to: string) {
	if (window.location.pathname === to) return
	window.history.pushState({}, '', to)
	mount()
}

/* Intercept same-origin anchor clicks for SPA navigation */
document.addEventListener('click', (e) => {
	const target = e.target as HTMLElement | null
	if (!target) return

	const anchor = target.closest?.('a') as HTMLAnchorElement | null

	if (!anchor) return

	const href = anchor.getAttribute('href')
	const targetAttr = anchor.getAttribute('target')
	const download = anchor.hasAttribute('download')

	if (!href) return

	// Only intercept internal links that start with '/'
	if (href.startsWith('/') && targetAttr !== '_blank' && !download) {
		e.preventDefault()
		navigate(href)
	}
})

/* Handle back/forward browser buttons */
window.addEventListener('popstate', mount)

/* Initial mount */
mount()

/* Initialize finance store (accounts, budgets, recurring) */
initializeFinanceStore().catch((err) => {
	console.error('Failed to initialize finance store:', err)
})
