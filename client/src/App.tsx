import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

/* ── Lazy-loaded Pages (Code-Splitting) ── */

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const LeadsPage = lazy(() => import('@/features/leads/LeadsPage'))
const KaltakquisePage = lazy(() => import('@/features/leads/KaltakquisePage'))
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'))
const DealsPage = lazy(() => import('@/features/deals/DealsPage'))
const CalculationsPage = lazy(() => import('@/features/calculations/CalculationsPage'))
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'))
const ProvisionPage = lazy(() => import('@/features/provision/ProvisionPage'))
const CommunicationPage = lazy(() => import('@/features/communication/CommunicationPage'))
const AiSummaryPage = lazy(() => import('@/features/ai/AiSummaryPage'))
const TasksPage = lazy(() => import('@/features/tasks/TasksPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const AdminPage = lazy(() => import('@/features/admin/AdminPage'))
const ExportPage = lazy(() => import('@/features/export/ExportPage'))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'))
const FeaturesPage = lazy(() => import('@/features/features/FeaturesPage'))
const PasswordsPage = lazy(() => import('@/features/passwords/PasswordsPage'))

/* ── Page Loading Spinner ── */

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin text-amber" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06080C' }}>
        <Loader2 size={32} className="animate-spin text-amber" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GL' || user?.role === 'GESCHAEFTSLEITUNG'
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function ModuleRoute({ moduleId, children }: { moduleId: string; children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (isAdmin) return <>{children}</>
  if (!user?.allowedModules?.includes(moduleId)) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06080C' }}>
        <Loader2 size={32} className="animate-spin text-amber" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login - oeffentlich */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Geschuetzte Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ModuleRoute moduleId="dashboard"><DashboardPage /></ModuleRoute>} />
            <Route path="leads" element={<ModuleRoute moduleId="leads"><LeadsPage excludeSource="KALTAKQUISE" /></ModuleRoute>} />
            <Route path="kaltakquise" element={<ModuleRoute moduleId="kaltakquise"><KaltakquisePage /></ModuleRoute>} />
            <Route path="appointments" element={<ModuleRoute moduleId="appointments"><AppointmentsPage /></ModuleRoute>} />
            <Route path="deals" element={<ModuleRoute moduleId="deals"><DealsPage /></ModuleRoute>} />
            <Route path="calculations" element={<ModuleRoute moduleId="calculations"><CalculationsPage /></ModuleRoute>} />
            <Route path="projects" element={<ModuleRoute moduleId="projects"><ProjectsPage /></ModuleRoute>} />
            <Route path="provision" element={<ModuleRoute moduleId="provision"><ProvisionPage /></ModuleRoute>} />
            <Route path="communication" element={<ModuleRoute moduleId="communication"><CommunicationPage /></ModuleRoute>} />
            <Route path="ai" element={<AiSummaryPage />} />
            <Route path="tasks" element={<ModuleRoute moduleId="tasks"><TasksPage /></ModuleRoute>} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="export" element={<ModuleRoute moduleId="export"><ExportPage /></ModuleRoute>} />
            <Route path="calendar" element={<ModuleRoute moduleId="calendar"><CalendarPage /></ModuleRoute>} />
            <Route path="documents" element={<ModuleRoute moduleId="documents"><DocumentsPage /></ModuleRoute>} />
            <Route path="passwords" element={<ModuleRoute moduleId="passwords"><PasswordsPage /></ModuleRoute>} />
            <Route path="features" element={<FeaturesPage />} />
            {/* Catch-all: redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
