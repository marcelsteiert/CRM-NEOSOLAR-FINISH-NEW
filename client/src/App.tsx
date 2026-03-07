import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import LeadsPage from '@/features/leads/LeadsPage'
import AppointmentsPage from '@/features/appointments/AppointmentsPage'
import DealsPage from '@/features/deals/DealsPage'
import CalculationsPage from '@/features/calculations/CalculationsPage'
import ProjectsPage from '@/features/projects/ProjectsPage'
import ProvisionPage from '@/features/provision/ProvisionPage'
import CommunicationPage from '@/features/communication/CommunicationPage'
import AiSummaryPage from '@/features/ai/AiSummaryPage'
import TasksPage from '@/features/tasks/TasksPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import AdminPage from '@/features/admin/AdminPage'
import ExportPage from '@/features/export/ExportPage'
import DocumentsPage from '@/features/documents/DocumentsPage'
import FeaturesPage from '@/features/features/FeaturesPage'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

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
          <Route path="leads" element={<ModuleRoute moduleId="leads"><LeadsPage /></ModuleRoute>} />
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
          <Route path="documents" element={<ModuleRoute moduleId="documents"><DocumentsPage /></ModuleRoute>} />
          <Route path="features" element={<FeaturesPage />} />
          {/* Catch-all: redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
