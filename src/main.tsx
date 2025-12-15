import { RouterProvider } from '@tanstack/react-router'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // <--- CRITICAL: Loads Tailwind and base styles

// TanStack Query Provider
import { QueryProvider } from '../app/lib/query'

// TanStack Router
import { router } from '../app/router'

// Initialize stores
import { initializeFinanceStore } from '../app/stores/finance'

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

/* Render the app with TanStack Router */
root.render(
	<React.StrictMode>
		<QueryProvider>
			<RouterProvider router={router} />
		</QueryProvider>
	</React.StrictMode>,
)

/* Initialize finance store (accounts, budgets, recurring) */
initializeFinanceStore().catch((err) => {
	console.error('Failed to initialize finance store:', err)
})
