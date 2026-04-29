import { useNavigate } from 'react-router-dom'
import {
  Sun, LogOut, Loader2, AlertCircle, CheckCircle2, Circle, Clock,
  FileCheck, Wrench, Zap, Sparkles, FileText, Download, Calendar,
  Phone, Mail, User as UserIcon, MapPin, Building2, CalendarClock, Globe,
} from 'lucide-react'
import { usePortalDashboard, type GroupKey, type PortalMilestone, type PortalProject } from './hooks/usePortalDashboard'
import { clearPortalSession, portalApi } from './portalApi'

const groupIcons: Record<GroupKey, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  BEWILLIGUNGEN: FileCheck,
  MONTAGE: Wrench,
  INBETRIEBNAHME: Zap,
  ABSCHLUSS: Sparkles,
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d: string, time: string | null): string {
  const date = new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return time ? `${date} um ${time}` : date
}

export default function PortalDashboard() {
  const navigate = useNavigate()
  const { data, isLoading, error } = usePortalDashboard()

  const handleLogout = () => {
    clearPortalSession()
    navigate('/portal/login', { replace: true })
  }

  const handleDownload = async (docId: string) => {
    try {
      const res = await portalApi.get<{ data: { url: string; fileName: string } }>(
        `/documents/${docId}/download`,
      )
      const a = document.createElement('a')
      a.href = res.data.url
      a.download = res.data.fileName
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: any) {
      alert(`Download fehlgeschlagen: ${err.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06080C' }}>
        <Loader2 size={32} className="animate-spin text-amber" />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06080C' }}>
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red" />
          <div className="text-text mb-2">Daten konnten nicht geladen werden</div>
          <button onClick={handleLogout} className="btn-secondary mt-4 text-xs">
            Erneut anmelden
          </button>
        </div>
      </div>
    )
  }

  const { contact, projects, milestones, documents, appointments, contactPersons, milestoneGroups } = data.data
  const customerName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'Kunde'

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.05), transparent 60%), #06080C',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: 'rgba(11,15,21,0.7)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="rounded-[10px] overflow-hidden flex items-center justify-center"
              style={{ background: '#FFFFFF', padding: '6px 10px' }}
            >
              <img src="/neosolar-logo.jpeg" alt="NeoSolar" className="h-7 object-contain" />
            </div>
            <div className="text-[12px] text-text-sec hidden sm:block">Kundenportal</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[12px] text-text">{customerName}</div>
              <div className="text-[11px] text-text-dim">{contact.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary text-xs"
              title="Abmelden"
            >
              <LogOut size={14} strokeWidth={1.8} />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-6">
        {/* Hero */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-text">
            Willkommen{contact.firstName ? `, ${contact.firstName}` : ''}
          </h1>
          <p className="text-sm text-text-sec">
            Hier sehen Sie den aktuellen Stand Ihrer Photovoltaik-Anlage in Echtzeit.
          </p>
        </div>

        {/* Projekte */}
        {projects.length === 0 ? (
          <div className="glass-card p-8 text-center" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="text-text mb-1">Noch kein aktives Projekt</div>
            <div className="text-sm text-text-sec">Sobald Ihr Projekt startet, sehen Sie hier alle Details.</div>
          </div>
        ) : (
          projects.map((project) => {
            const projectMilestones = milestones.filter((m) => m.projectId === project.id)
            const total = projectMilestones.length
            const done = projectMilestones.filter((m) => m.status === 'DONE').length
            const percent = total ? Math.round((done / total) * 100) : 0
            const nextMilestone = projectMilestones.find((m) => m.status !== 'DONE')

            return (
              <div key={project.id} className="space-y-5">
                <ProjectHeroCard
                  project={project}
                  percent={percent}
                  done={done}
                  total={total}
                  nextMilestone={nextMilestone ?? null}
                  customerName={customerName}
                />
                {project.inOfferMode ? (
                  <OfferModeView
                    project={project}
                    milestones={projectMilestones}
                    documents={documents}
                    onDownload={handleDownload}
                  />
                ) : (
                  <>
                    <KeyDatesCard milestones={projectMilestones} />
                    <MilestoneTimeline
                      milestones={projectMilestones}
                      groups={milestoneGroups}
                    />
                  </>
                )}
              </div>
            )
          })
        )}

        {/* Termine */}
        {appointments.length > 0 && (
          <SectionCard title="Anstehende Termine" icon={Calendar}>
            <div className="divide-y divide-border">
              {appointments.map((appt) => (
                <div key={appt.id} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex flex-col items-center justify-center"
                    style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'rgba(96,165,250,0.1)',
                      border: '1px solid rgba(96,165,250,0.2)',
                    }}
                  >
                    <Calendar size={18} strokeWidth={1.8} style={{ color: '#60A5FA' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">
                      {appt.appointmentType === 'VOR_ORT' ? 'Vor-Ort-Termin' : 'Online-Termin'}
                    </div>
                    <div className="text-xs text-text-sec mt-0.5">
                      {formatDateTime(appt.appointmentDate, appt.appointmentTime)}
                    </div>
                    {appt.notes && <div className="text-[11px] text-text-dim mt-1 line-clamp-2">{appt.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Dokumente – gruppiert nach Kategorie */}
        {documents.length > 0 && !projects.some((p) => p.inOfferMode) && (() => {
          const CATEGORY_COLORS: Record<string, string> = {
            Vertraege: '#F59E0B',
            Bewilligungen: '#60A5FA',
            Datenblaetter: '#A78BFA',
            Plaene: '#22D3EE',
            Messprotokolle: '#FB923C',
            Rechnungen: '#34D399',
            Bilder: '#F472B6',
            Sonstiges: '#94A3B8',
          }
          const grouped: Record<string, typeof documents> = {}
          for (const d of documents) {
            const key = d.folderPath ?? 'Sonstiges'
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(d)
          }
          const order = ['Vertraege', 'Bewilligungen', 'Plaene', 'Datenblaetter', 'Messprotokolle', 'Rechnungen', 'Bilder', 'Sonstiges']
          const sortedKeys = order.filter((k) => grouped[k]).concat(
            Object.keys(grouped).filter((k) => !order.includes(k)),
          )

          return (
            <SectionCard title="Dokumente" icon={FileText}>
              <div className="divide-y divide-border">
                {sortedKeys.map((catKey) => {
                  const items = grouped[catKey]
                  const color = CATEGORY_COLORS[catKey] ?? '#94A3B8'
                  return (
                    <div key={catKey}>
                      <div
                        className="px-5 py-2 flex items-center gap-2"
                        style={{ background: `color-mix(in srgb, ${color} 5%, transparent)` }}
                      >
                        <div className="w-1 h-3 rounded-full" style={{ background: color }} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-text">{catKey}</span>
                        <span className="text-[11px] text-text-sec ml-auto">{items.length}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleDownload(doc.id)}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors text-left"
                          >
                            <div
                              className="flex-shrink-0 flex items-center justify-center"
                              style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                              }}
                            >
                              <FileText size={16} strokeWidth={1.8} style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text truncate">{doc.fileName}</div>
                              <div className="text-[11px] text-text-sec mt-0.5">
                                {(doc.fileSize / 1024).toFixed(0)} KB &middot; {formatDate(doc.createdAt)}
                              </div>
                            </div>
                            <Download size={16} strokeWidth={1.8} className="text-text-sec flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )
        })()}

        {/* Ansprechpartner */}
        {contactPersons.length > 0 && (
          <SectionCard title="Ihre Ansprechpartner" icon={UserIcon}>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {contactPersons.map((person) => (
                <div key={person.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-white font-semibold"
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: person.avatarColor ?? '#F59E0B',
                        fontSize: 14,
                      }}
                    >
                      {person.firstName?.[0]}{person.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text">{person.firstName} {person.lastName}</div>
                      <div className="text-[11px] text-text-sec uppercase tracking-wider">
                        {person.role === 'VERTRIEB' ? 'Verkauf' : person.role === 'PROJEKTLEITUNG' ? 'Projektleitung' : person.role === 'ADMIN' ? 'Geschaeftsleitung' : person.role}
                      </div>
                      <div className="mt-2 space-y-1">
                        {person.email && (
                          <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 text-xs text-text-sec hover:text-text transition-colors">
                            <Mail size={12} strokeWidth={1.8} />
                            {person.email}
                          </a>
                        )}
                        {person.phone && (
                          <a href={`tel:${person.phone}`} className="flex items-center gap-1.5 text-xs text-text-sec hover:text-text transition-colors">
                            <Phone size={12} strokeWidth={1.8} />
                            {person.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Kontakt-Adresse */}
        {(contact.address || contact.company) && (
          <SectionCard title="Anlagen-Standort" icon={MapPin}>
            <div className="px-5 py-4">
              {contact.company && (
                <div className="flex items-center gap-2 text-sm text-text mb-1">
                  <Building2 size={14} strokeWidth={1.8} className="text-text-sec" />
                  {contact.company}
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2 text-sm text-text-sec">
                  <MapPin size={14} strokeWidth={1.8} className="text-text-dim" />
                  {contact.address}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Firma erreichen */}
        {(data.data.branding?.companyPhone || data.data.branding?.companyEmail) && (
          <SectionCard title={`So erreichen Sie ${data.data.branding.companyName}`} icon={Building2}>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(data.data.branding.companyAddress || data.data.branding.companyCity) && (
                <div className="flex items-start gap-2 text-sm text-text-sec">
                  <MapPin size={14} strokeWidth={1.8} className="text-text-dim mt-0.5" />
                  <div>
                    {data.data.branding.companyAddress && <div>{data.data.branding.companyAddress}</div>}
                    {(data.data.branding.companyZip || data.data.branding.companyCity) && (
                      <div>{[data.data.branding.companyZip, data.data.branding.companyCity].filter(Boolean).join(' ')}</div>
                    )}
                  </div>
                </div>
              )}
              {data.data.branding.companyPhone && (
                <a href={`tel:${data.data.branding.companyPhone}`} className="flex items-center gap-2 text-sm text-text-sec hover:text-amber transition-colors">
                  <Phone size={14} strokeWidth={1.8} className="text-text-dim" />
                  {data.data.branding.companyPhone}
                </a>
              )}
              {data.data.branding.companyEmail && (
                <a href={`mailto:${data.data.branding.companyEmail}`} className="flex items-center gap-2 text-sm text-text-sec hover:text-amber transition-colors">
                  <Mail size={14} strokeWidth={1.8} className="text-text-dim" />
                  {data.data.branding.companyEmail}
                </a>
              )}
              {data.data.branding.companyWebsite && (
                <a href={`https://${data.data.branding.companyWebsite.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-text-sec hover:text-amber transition-colors">
                  <Globe size={14} strokeWidth={1.8} className="text-text-dim" />
                  {data.data.branding.companyWebsite}
                </a>
              )}
              {data.data.branding.companyOpeningHours && (
                <div className="flex items-center gap-2 text-sm text-text-sec sm:col-span-2">
                  <Clock size={14} strokeWidth={1.8} className="text-text-dim" />
                  {data.data.branding.companyOpeningHours}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <div className="text-center pt-4 pb-8 text-[11px] text-text-dim">
          {data.data.branding?.companyName ?? 'NEOSOLAR AG'}
          {data.data.branding?.companySlogan ? ` · ${data.data.branding.companySlogan}` : ''}
        </div>
      </main>
    </div>
  )
}

// ── Hero-Card mit Fortschritt ──

function ProjectHeroCard({
  project,
  percent,
  done,
  total,
  nextMilestone,
  customerName,
}: {
  project: PortalProject
  percent: number
  done: number
  total: number
  nextMilestone: PortalMilestone | null
  customerName: string
}) {
  return (
    <div
      className="relative overflow-hidden p-6 sm:p-8"
      style={{
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,146,60,0.06) 60%, rgba(255,255,255,0.02))',
        border: '1px solid rgba(245,158,11,0.2)',
        boxShadow: '0 0 60px rgba(245,158,11,0.08)',
      }}
    >
      {/* Sun decoration */}
      <div
        className="absolute -top-8 -right-8 opacity-15 pointer-events-none"
        style={{ width: 180, height: 180 }}
      >
        <Sun size={180} strokeWidth={0.8} style={{ color: '#F59E0B' }} />
      </div>

      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.18em] text-amber font-semibold mb-2">
          {project.inOfferMode ? 'Ihr persoenliches Angebot' : 'Ihre PV-Anlage'}
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-text mb-1">{project.name}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-sec">
          {project.kwp > 0 && <span>{project.kwp.toLocaleString('de-CH', { maximumFractionDigits: 2 })} kWp Leistung</span>}
          {project.startDate && !project.inOfferMode && <span>Start: {formatDate(project.startDate)}</span>}
        </div>
        {project.inOfferMode && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            <FileText size={11} strokeWidth={2} />
            In Pruefung – Angebot eingereicht
          </div>
        )}

        {/* Fortschritt – nur wenn nicht im Angebot-Modus */}
        {!project.inOfferMode && <div className="mt-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-text-sec font-semibold">Fortschritt</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-3xl sm:text-4xl font-bold text-text">{percent}<span className="text-xl text-text-sec">%</span></div>
                <div className="text-xs text-text-sec">{done} von {total} Schritten</div>
              </div>
            </div>
            {percent === 100 ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <CheckCircle2 size={12} strokeWidth={2} />
                Komplett erledigt
              </div>
            ) : nextMilestone && (
              <div className="text-right max-w-[60%]">
                <div className="text-[10px] uppercase tracking-wider text-text-sec font-semibold">Naechster Schritt</div>
                <div className="text-xs text-text mt-0.5 truncate">{nextMilestone.label}</div>
              </div>
            )}
          </div>

          <div
            className="w-full overflow-hidden"
            style={{
              height: 10,
              borderRadius: 999,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FB923C)',
                borderRadius: 999,
                boxShadow: '0 0 16px rgba(245,158,11,0.5)',
              }}
            />
          </div>
        </div>}
      </div>
    </div>
  )
}

// ── Milestone-Timeline ──

function MilestoneTimeline({
  milestones,
  groups,
}: {
  milestones: PortalMilestone[]
  groups: Record<GroupKey, { label: string; description: string; color: string; icon: string }>
}) {
  const grouped: Record<GroupKey, PortalMilestone[]> = {
    BEWILLIGUNGEN: [],
    MONTAGE: [],
    INBETRIEBNAHME: [],
    ABSCHLUSS: [],
  }
  for (const m of milestones) grouped[m.groupKey]?.push(m)

  return (
    <div className="space-y-4">
      {(Object.keys(grouped) as GroupKey[]).map((groupKey) => {
        const items = grouped[groupKey]
        if (!items.length) return null
        const groupInfo = groups[groupKey]
        const Icon = groupIcons[groupKey]
        const groupDone = items.filter((m) => m.status === 'DONE').length
        const allDone = groupDone === items.length

        return (
          <div
            key={groupKey}
            className="glass-card overflow-hidden"
            style={{
              borderRadius: 'var(--radius-lg)',
              borderColor: allDone ? `color-mix(in srgb, ${groupInfo.color} 25%, transparent)` : undefined,
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between border-b border-border"
              style={{
                background: `color-mix(in srgb, ${groupInfo.color} 6%, transparent)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${groupInfo.color} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${groupInfo.color} 25%, transparent)`,
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">{groupInfo.label}</div>
                  <div className="text-[11px] text-text-sec">{groupInfo.description}</div>
                </div>
              </div>
              <div className="text-xs">
                <span style={{ color: groupInfo.color }} className="font-semibold">{groupDone}</span>
                <span className="text-text-dim"> / {items.length}</span>
              </div>
            </div>

            <div className="relative px-5 py-4">
              {/* Vertikale Linie */}
              <div
                className="absolute left-[28px] top-4 bottom-4"
                style={{ width: 2, background: 'rgba(255,255,255,0.05)' }}
              />

              <div className="space-y-3 relative">
                {items.map((m) => {
                  const isDone = m.status === 'DONE'
                  const isProgress = m.status === 'IN_PROGRESS'
                  const StatusIcon = isDone ? CheckCircle2 : isProgress ? Clock : Circle

                  return (
                    <div key={m.id} className="flex items-start gap-3 relative">
                      <div
                        className="flex-shrink-0 flex items-center justify-center relative z-10"
                        style={{
                          width: 24, height: 24, borderRadius: 999,
                          background: isDone ? 'rgba(52,211,153,0.2)' : isProgress ? 'rgba(245,158,11,0.2)' : '#0B0F15',
                          border: `2px solid ${isDone ? '#34D399' : isProgress ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: isDone ? '0 0 8px rgba(52,211,153,0.3)' : isProgress ? '0 0 8px rgba(245,158,11,0.3)' : 'none',
                        }}
                      >
                        <StatusIcon size={12} strokeWidth={2.5} style={{ color: isDone ? '#34D399' : isProgress ? '#F59E0B' : '#525E6F' }} />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${isDone ? 'text-text-sec line-through' : 'text-text font-medium'}`}>
                              {m.label}
                            </div>
                            {m.completedAt && (
                              <div className="text-[11px] text-green mt-0.5 flex items-center gap-1">
                                <CheckCircle2 size={10} strokeWidth={2} />
                                Erledigt am {formatDate(m.completedAt)}
                              </div>
                            )}
                            {!isDone && m.scheduledDate && (
                              <div className="text-[11px] text-amber mt-0.5 flex items-center gap-1">
                                <Calendar size={10} strokeWidth={2} />
                                Geplant: {formatDate(m.scheduledDate)}
                                {m.scheduledTime && <span> &middot; {m.scheduledTime} Uhr</span>}
                              </div>
                            )}
                            {isProgress && (
                              <div className="text-[11px] text-amber mt-0.5">In Bearbeitung</div>
                            )}
                          </div>
                        </div>
                        {m.comment && (
                          <div className="mt-1.5 text-[12px] text-text-sec leading-relaxed bg-surface px-3 py-2 rounded-lg border border-border">
                            {m.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Section-Card ──

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  children: React.ReactNode
}) {
  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon size={15} strokeWidth={1.8} />
        <span className="text-sm font-semibold text-text">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Wichtige Termine fuer den Kunden ──

const KEY_DATE_KEYS: { key: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; color: string }[] = [
  { key: 'DC_MONTAGE_TERMIN', icon: Wrench, color: '#FB923C' },
  { key: 'AC_TERMIN', icon: Zap, color: '#F59E0B' },
  { key: 'KOMPLETT_ERLEDIGT', icon: CheckCircle2, color: '#34D399' },
]

function daysUntilLabel(date: string | null): { text: string; color: string } | null {
  if (!date) return null
  const target = new Date(date).setHours(0, 0, 0, 0)
  const today = new Date().setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: `vor ${Math.abs(diff)} Tag${Math.abs(diff) === 1 ? '' : 'en'}`, color: '#525E6F' }
  if (diff === 0) return { text: 'Heute', color: '#F59E0B' }
  if (diff === 1) return { text: 'Morgen', color: '#F59E0B' }
  if (diff <= 7) return { text: `in ${diff} Tagen`, color: '#FB923C' }
  return { text: `in ${diff} Tagen`, color: '#8B95A5' }
}

function KeyDatesCard({ milestones }: { milestones: any[] }) {
  const items = KEY_DATE_KEYS
    .map((tpl) => {
      const m = milestones.find((m) => m.milestoneKey === tpl.key && m.scheduledDate)
      return m ? { tpl, m } : null
    })
    .filter(Boolean) as { tpl: typeof KEY_DATE_KEYS[0]; m: any }[]

  if (items.length === 0) return null

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(180deg, rgba(245,158,11,0.06), rgba(255,255,255,0.02))',
        border: '1px solid rgba(245,158,11,0.18)',
      }}
    >
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <CalendarClock size={16} strokeWidth={1.8} className="text-amber" />
        <span className="text-sm font-semibold text-text">Geplante Termine</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {items.map(({ tpl, m }) => {
          const Icon = tpl.icon
          const cd = daysUntilLabel(m.scheduledDate)
          const dateStr = new Date(m.scheduledDate).toLocaleDateString('de-CH', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          return (
            <div key={tpl.key} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `color-mix(in srgb, ${tpl.color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${tpl.color} 25%, transparent)`,
                  }}
                >
                  <Icon size={14} strokeWidth={1.8} />
                </div>
                <div className="text-[11px] uppercase tracking-wider text-text-sec font-semibold flex-1 truncate">
                  {m.label}
                </div>
              </div>
              <div className="text-base font-semibold text-text">
                {dateStr}
                {m.scheduledTime && (
                  <span className="text-text-sec font-normal text-sm"> &middot; {m.scheduledTime} Uhr</span>
                )}
              </div>
              {cd && (
                <div className="text-[12px] mt-1 font-medium" style={{ color: cd.color }}>
                  {cd.text}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── OfferModeView: Spezielles Layout solange Deal noch im Angebot ──

function OfferModeView({
  project,
  milestones,
  documents,
  onDownload,
}: {
  project: any
  milestones: any[]
  documents: any[]
  onDownload: (id: string) => Promise<void>
}) {
  const dcMontage = milestones.find((m) => m.milestoneKey === 'DC_MONTAGE_TERMIN')
  const offerDocs = documents.filter((d) => {
    const cat = (d.folderPath ?? '').toLowerCase()
    return cat.includes('vertra') || cat.includes('offert') || d.entityType === 'ANGEBOT'
  })
  const allOfferDocs = offerDocs.length > 0 ? offerDocs : documents
  const cd = dcMontage?.scheduledDate ? daysUntilLabel(dcMontage.scheduledDate) : null

  return (
    <div className="space-y-5">
      {/* Voraussichtlicher Montagetermin – PROMINENT */}
      {dcMontage?.scheduledDate && (
        <div
          className="overflow-hidden p-6 sm:p-8 relative"
          style={{
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(251,146,60,0.10), rgba(245,158,11,0.04))',
            border: '1px solid rgba(251,146,60,0.25)',
          }}
        >
          <div
            className="absolute -top-6 -right-6 opacity-10 pointer-events-none"
            style={{ width: 140, height: 140 }}
          >
            <CalendarClock size={140} strokeWidth={0.8} style={{ color: '#FB923C' }} />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock size={16} strokeWidth={1.8} style={{ color: '#FB923C' }} />
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: '#FB923C' }}>
                Voraussichtlicher Montagetermin
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap mt-3">
              <div className="text-2xl sm:text-4xl font-bold text-text">
                {new Date(dcMontage.scheduledDate).toLocaleDateString('de-CH', {
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                })}
              </div>
              {dcMontage.scheduledTime && (
                <div className="text-lg text-text-sec">um {dcMontage.scheduledTime} Uhr</div>
              )}
            </div>

            {cd && (
              <div className="mt-2 text-sm font-medium" style={{ color: cd.color }}>
                {cd.text}
              </div>
            )}

            <div className="mt-4 text-[13px] text-text-sec leading-relaxed max-w-2xl">
              Sobald wir Ihre Bestellung erhalten haben, beginnen wir mit der Vorbereitung Ihrer
              PV-Anlage. Der Termin kann sich noch leicht verschieben – wir informieren Sie
              rechtzeitig ueber den definitiven Termin.
            </div>
          </div>
        </div>
      )}

      {/* Offerte zum Download */}
      {allOfferDocs.length > 0 ? (
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(180deg, rgba(245,158,11,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <FileText size={16} strokeWidth={1.8} className="text-amber" />
            <span className="text-sm font-semibold text-text">Ihr persoenliches Angebot</span>
            <span className="text-[11px] text-text-sec ml-auto">{allOfferDocs.length} Dokument{allOfferDocs.length === 1 ? '' : 'e'}</span>
          </div>
          <div className="px-5 py-3 text-[13px] text-text-sec border-b border-border">
            Hier finden Sie Ihre Offerte und alle Vertragsunterlagen zum Durchlesen.
          </div>
          <div className="divide-y divide-border">
            {allOfferDocs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onDownload(doc.id)}
                className="w-full px-5 py-4 flex items-center gap-3 hover:bg-surface-hover transition-colors text-left group"
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}
                >
                  <FileText size={18} strokeWidth={1.8} style={{ color: '#F59E0B' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text truncate">{doc.fileName}</div>
                  <div className="text-[11px] text-text-sec mt-0.5">
                    {(doc.fileSize / 1024).toFixed(0)} KB &middot; {formatDate(doc.createdAt)}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all group-hover:bg-amber group-hover:text-bg"
                  style={{
                    background: 'rgba(245,158,11,0.12)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}
                >
                  <Download size={12} strokeWidth={2} />
                  Download
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="px-5 py-6 text-center"
          style={{
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}
        >
          <FileText size={20} className="mx-auto mb-2 text-text-dim" />
          <div className="text-sm text-text-sec">Ihre Offerte wird in Kuerze hier verfuegbar sein</div>
        </div>
      )}

      {/* So geht es weiter – Workflow */}
      <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.8} className="text-amber" />
          <span className="text-sm font-semibold text-text">So geht es weiter</span>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            <WorkflowStep
              step={1}
              title="Sie pruefen unser Angebot"
              description="Schauen Sie sich die Offerte in Ruhe an. Bei Fragen meldet sich Ihr Ansprechpartner gerne."
              status="active"
            />
            <WorkflowStep
              step={2}
              title="Vertragsunterzeichnung"
              description="Sobald Sie unser Angebot annehmen, schicken wir Ihnen den Vertrag."
              status="pending"
            />
            <WorkflowStep
              step={3}
              title="Wir kuemmern uns um die Bewilligungen"
              description="Baubewilligung, Anschlussgesuch und Installationsanzeige reichen wir fuer Sie ein."
              status="pending"
            />
            <WorkflowStep
              step={4}
              title="Material und Termin"
              description="Wir bestellen die Komponenten und koordinieren den Montagetermin."
              status="pending"
            />
            <WorkflowStep
              step={5}
              title="Montage und Inbetriebnahme"
              description="Unser Team installiert Ihre PV-Anlage und nimmt sie in Betrieb."
              status="pending"
              isLast
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowStep({
  step, title, description, status, isLast = false,
}: {
  step: number
  title: string
  description: string
  status: 'active' | 'pending' | 'done'
  isLast?: boolean
}) {
  const isActive = status === 'active'
  const isDone = status === 'done'
  return (
    <div className="flex gap-4 relative">
      {!isLast && (
        <div
          className="absolute left-[15px] top-8 bottom-[-16px]"
          style={{ width: 2, background: 'rgba(255,255,255,0.06)' }}
        />
      )}
      <div
        className="flex-shrink-0 flex items-center justify-center text-[12px] font-bold relative z-10"
        style={{
          width: 32, height: 32, borderRadius: 999,
          background: isActive
            ? 'rgba(245,158,11,0.18)'
            : isDone
            ? 'rgba(52,211,153,0.18)'
            : 'rgba(255,255,255,0.04)',
          border: `2px solid ${isActive ? '#F59E0B' : isDone ? '#34D399' : 'rgba(255,255,255,0.1)'}`,
          color: isActive ? '#F59E0B' : isDone ? '#34D399' : '#525E6F',
          boxShadow: isActive ? '0 0 12px rgba(245,158,11,0.3)' : 'none',
        }}
      >
        {isDone ? <CheckCircle2 size={14} strokeWidth={2.5} /> : step}
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className={`text-sm font-semibold ${isActive ? 'text-text' : 'text-text-sec'}`}>
          {title}
        </div>
        <div className="text-[12px] text-text-sec mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  )
}
