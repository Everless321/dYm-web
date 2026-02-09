import './assets/main.css'

import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { Toaster } from './components/ui/sonner'
import { setOnUnauthorized } from './api/client'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1
    }
  }
})

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  const logout = useCallback(() => {
    localStorage.removeItem('dym_token')
    setAuthed(false)
  }, [])

  useEffect(() => {
    setOnUnauthorized(logout)
    const token = localStorage.getItem('dym_token')
    if (!token) { setAuthed(false); return }
    fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => { setAuthed(r.ok) })
      .catch(() => setAuthed(false))
  }, [logout])

  if (authed === null) return null
  if (!authed) return <LoginPage onSuccess={() => setAuthed(true)} />

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
