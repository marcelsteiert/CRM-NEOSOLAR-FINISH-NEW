import { Outlet } from 'react-router-dom'
import Sidebar, { SidebarProvider, useSidebarPinned } from './Sidebar'
import TopBar from './TopBar'
import ReminderPopup from '@/components/ui/ReminderPopup'

function LayoutContent() {
  const { pinned } = useSidebarPinned()

  return (
    <div className="ambient-bg min-h-screen bg-bg">
      <Sidebar />
      <div
        className="relative z-10"
        style={{
          marginLeft: pinned ? '220px' : '72px',
          transition: 'margin-left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <TopBar />
        <main className="p-7">
          <Outlet />
        </main>
      </div>
      <ReminderPopup />
    </div>
  )
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  )
}
