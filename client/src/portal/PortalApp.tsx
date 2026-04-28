import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { getPortalToken } from './portalApi'

const PortalLoginPage = lazy(() => import('./PortalLoginPage'))
const PortalDashboard = lazy(() => import('./PortalDashboard'))

function PortalLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#06080C' }}>
      <Loader2 size={28} className="animate-spin text-amber" />
    </div>
  )
}

function PortalProtected({ children }: { children: React.ReactNode }) {
  const token = getPortalToken()
  if (!token) return <Navigate to="/portal/login" replace />
  return <>{children}</>
}

export default function PortalApp() {
  return (
    <Suspense fallback={<PortalLoader />}>
      <Routes>
        <Route path="login" element={<PortalLoginPage />} />
        <Route
          index
          element={
            <PortalProtected>
              <PortalDashboard />
            </PortalProtected>
          }
        />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </Suspense>
  )
}
