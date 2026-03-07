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
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="calculations" element={<CalculationsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="provision" element={<ProvisionPage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="ai" element={<AiSummaryPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="features" element={<FeaturesPage />} />
          {/* Catch-all: redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
