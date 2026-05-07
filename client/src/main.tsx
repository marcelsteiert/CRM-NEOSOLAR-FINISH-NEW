import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { FeatureFlagProvider } from './hooks/useFeatureFlags'
import { AuthProvider } from './hooks/useAuth'

// Light-Theme komplett deaktiviert — Dark-Mode only
document.documentElement.classList.remove('light')
try { localStorage.removeItem('neosolar-theme') } catch { /* ignore */ }

// Error Boundary to catch render errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#F87171', fontFamily: 'monospace', background: '#0B0F15', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 20, marginBottom: 16 }}>App-Fehler</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#F0F2F5', fontSize: 13 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#94A3B8', fontSize: 11, marginTop: 8 }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,        // 2 Min – Daten bleiben frisch
      gcTime: 15 * 60_000,          // 15 Min Cache behalten nach unmount
      retry: 1,
      refetchOnWindowFocus: false,  // Kein Refetch bei Tab-Wechsel
      refetchOnReconnect: true,     // Nur bei Netzwerk-Reconnect
      refetchOnMount: false,        // Tab-Wechsel = sofort cached anzeigen
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeatureFlagProvider>
            <App />
          </FeatureFlagProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
