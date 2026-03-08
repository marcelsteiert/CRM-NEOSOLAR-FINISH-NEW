import { useState } from 'react'
import { Settings } from 'lucide-react'
import AdminNav, { type AdminSection } from './components/AdminNav'
import PipelineAdminSection from './components/PipelineAdminSection'
import AutomationRulesSection from './components/AutomationRulesSection'
import CompanyLocationsSection from './components/CompanyLocationsSection'
import UsersRolesSection from './components/UsersRolesSection'
import TagManagementSection from './components/TagManagementSection'
import ProductCatalogSection from './components/ProductCatalogSection'
import IntegrationsSection from './components/IntegrationsSection'
import WebhookSection from './components/WebhookSection'
import DocumentTemplatesSection from './components/DocumentTemplatesSection'
import NotificationSettingsSection from './components/NotificationSettingsSection'
import AiSettingsSection from './components/AiSettingsSection'
import AuditLogSection from './components/AuditLogSection'
import CompanyBrandingSection from './components/CompanyBrandingSection'
import DatabaseExportSection from './components/DatabaseExportSection'
import ProjectPhasesSection from './components/ProjectPhasesSection'
import SharedPasswordsSection from './components/SharedPasswordsSection'

const sectionTitles: Record<AdminSection, { title: string; desc: string }> = {
  users: { title: 'Benutzer & Rollen', desc: 'Benutzer verwalten, Rollen und Modul-Berechtigungen zuweisen' },
  locations: { title: 'Firmenstandorte', desc: 'Standorte für Fahrzeit-Berechnung verwalten' },
  pipelines: { title: 'Pipeline-Verwaltung', desc: 'Lead- und Deal-Pipelines mit Stufen konfigurieren' },
  products: { title: 'Stammdaten / Preisdatenbank', desc: 'PV-Module, Wechselrichter, Batterien und Preise pflegen' },
  tags: { title: 'Tag-Verwaltung', desc: 'Tags erstellen, bearbeiten und Farben zuweisen' },
  automations: { title: 'Automations-Regeln', desc: 'Follow-Up Regeln, Checklisten und Wiedervorlage-Logik' },
  projectPhases: { title: 'Projekt-Phasen', desc: 'Checklisten-Schritte pro Projektphase konfigurieren' },
  integrations: { title: 'Integrationen', desc: 'Outlook, 3CX, Zoom und Bexio verbinden' },
  webhooks: { title: 'Webhook-Verwaltung', desc: 'Leadquellen und Webhooks konfigurieren' },
  templates: { title: 'Dokumenten-Vorlagen', desc: 'Ordnerstruktur-Templates pro Entität definieren' },
  notifications: { title: 'Benachrichtigungen', desc: 'Push-Einstellungen und Erinnerungs-Intervalle' },
  branding: { title: 'Firmen-Branding', desc: 'Logo, Firmenname und Angebotsvorlage anpassen' },
  ai: { title: 'KI-Einstellungen', desc: 'AI Summary konfigurieren – Modell, Sprache, Aktivierung' },
  audit: { title: 'Audit-Log', desc: 'Systemweites Protokoll aller Änderungen' },
  database: { title: 'Datenbank & Export', desc: 'Backup, Massenexport und API-Zugriff' },
  passwords: { title: 'Geteilte Passwörter', desc: 'Team-Passwörter verwalten und Rollen-Berechtigungen setzen' },
}

const sectionComponents: Record<AdminSection, React.ComponentType> = {
  users: UsersRolesSection,
  locations: CompanyLocationsSection,
  pipelines: PipelineAdminSection,
  products: ProductCatalogSection,
  tags: TagManagementSection,
  automations: AutomationRulesSection,
  projectPhases: ProjectPhasesSection,
  integrations: IntegrationsSection,
  webhooks: WebhookSection,
  templates: DocumentTemplatesSection,
  notifications: NotificationSettingsSection,
  branding: CompanyBrandingSection,
  ai: AiSettingsSection,
  audit: AuditLogSection,
  database: DatabaseExportSection,
  passwords: SharedPasswordsSection,
}

export default function AdminPage() {
  const [active, setActive] = useState<AdminSection>('users')

  const info = sectionTitles[active]
  const SectionComponent = sectionComponents[active]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[14px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, #A78BFA 12%, transparent), color-mix(in srgb, #A78BFA 4%, transparent))',
            border: '1px solid color-mix(in srgb, #A78BFA 10%, transparent)',
          }}
        >
          <Settings size={20} className="text-violet-400" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-[-0.02em]">Administration</h1>
          <p className="text-[12px] text-text-sec mt-0.5 hidden sm:block">Systemkonfiguration und Einstellungen</p>
        </div>
      </div>

      {/* Content: Nav + Section */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
        <AdminNav active={active} onChange={setActive} />
        <div className="flex-1 min-w-0 space-y-4">
          {/* Section Title */}
          <div>
            <h2 className="text-[14px] sm:text-[16px] font-bold tracking-[-0.01em]">{info.title}</h2>
            <p className="text-[11px] sm:text-[12px] text-text-sec mt-0.5 hidden sm:block">{info.desc}</p>
          </div>
          {/* Section Content */}
          <SectionComponent />
        </div>
      </div>
    </div>
  )
}
