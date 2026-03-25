import { PhoneOutgoing } from 'lucide-react'
import LeadsPage from './LeadsPage'

export default function KaltakquisePage() {
  return (
    <LeadsPage
      fixedSource="KALTAKQUISE"
      pageTitle="Kaltakquise"
      pageDescription="Kaltakquise-Leads verwalten und zu Terminen konvertieren"
      pageIcon={PhoneOutgoing}
    />
  )
}
