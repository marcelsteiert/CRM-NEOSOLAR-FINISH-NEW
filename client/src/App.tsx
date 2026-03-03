import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import LeadsPage from '@/features/leads/LeadsPage'
import DealsPage from '@/features/deals/DealsPage'
import CalculationsPage from '@/features/calculations/CalculationsPage'
import ProjectsPage from '@/features/projects/ProjectsPage'
import InvoicesPage from '@/features/invoices/InvoicesPage'
import CommunicationPage from '@/features/communication/CommunicationPage'
import AiSummaryPage from '@/features/ai/AiSummaryPage'
import TasksPage from '@/features/tasks/TasksPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import RolesPage from '@/features/roles/RolesPage'
import ExportPage from '@/features/export/ExportPage'
import DocumentsPage from '@/features/documents/DocumentsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="calculations" element={<CalculationsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="ai" element={<AiSummaryPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="documents" element={<DocumentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
