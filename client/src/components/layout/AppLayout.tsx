import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="ambient-bg min-h-screen bg-bg">
      <Sidebar />
      <div className="ml-[72px] relative z-10">
        <TopBar />
        <main className="p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
