// ===========================================================================
// Kundenportal: Master-Definition der 14 PV-Anlagen-Meilensteine
// (basierend auf Excel-Checkliste "Neosolar PV-Anlagen Uebersicht")
// ===========================================================================

export type MilestoneKey =
  | 'BAUBEWILLIGUNG'
  | 'TAG_EINGEREICHT'
  | 'TAG_BEWILLIGT'
  | 'IA_EINGEREICHT'
  | 'IA_BEWILLIGT'
  | 'DC_MONTAGE_TERMIN'
  | 'DC_MONTAGE_AUSGEFUEHRT'
  | 'AC_TERMIN'
  | 'AC_INSTALLIERT'
  | 'GBA'
  | 'SINA'
  | 'MPP'
  | 'PRONOVO'
  | 'KOMPLETT_ERLEDIGT'

export type GroupKey = 'BEWILLIGUNGEN' | 'MONTAGE' | 'INBETRIEBNAHME' | 'ABSCHLUSS'

export interface MilestoneTemplate {
  key: MilestoneKey
  group: GroupKey
  label: string
  customerLabel: string
  description: string
  emailSubject: string
  emailBody: string
}

export const milestoneGroups: Record<GroupKey, { label: string; description: string; color: string; icon: string }> = {
  BEWILLIGUNGEN: {
    label: 'Bewilligungen',
    description: 'Behoerden- und Netzbetreiber-Freigaben',
    color: '#60A5FA',
    icon: 'FileCheck',
  },
  MONTAGE: {
    label: 'Montage',
    description: 'Installation auf dem Dach und Verkabelung',
    color: '#FB923C',
    icon: 'Wrench',
  },
  INBETRIEBNAHME: {
    label: 'Inbetriebnahme',
    description: 'Messprotokolle und behoerdliche Anmeldungen',
    color: '#A78BFA',
    icon: 'Zap',
  },
  ABSCHLUSS: {
    label: 'Abschluss',
    description: 'Anlage komplett uebergeben',
    color: '#34D399',
    icon: 'CheckCircle2',
  },
}

export const milestoneTemplates: MilestoneTemplate[] = [
  {
    key: 'BAUBEWILLIGUNG',
    group: 'BEWILLIGUNGEN',
    label: 'Baubewilligung',
    customerLabel: 'Baubewilligung erteilt',
    description: 'Bewilligung der Gemeinde fuer Ihre PV-Anlage',
    emailSubject: 'Baubewilligung fuer Ihre PV-Anlage erteilt',
    emailBody: 'Wir freuen uns, Ihnen mitteilen zu duerfen, dass die Baubewilligung fuer Ihre Photovoltaik-Anlage erteilt wurde. Damit ist der erste wichtige Schritt geschafft.',
  },
  {
    key: 'TAG_EINGEREICHT',
    group: 'BEWILLIGUNGEN',
    label: 'TAG eingereicht',
    customerLabel: 'Technisches Anschlussgesuch eingereicht',
    description: 'Antrag beim Energieversorger gestellt',
    emailSubject: 'Technisches Anschlussgesuch eingereicht',
    emailBody: 'Das Technische Anschlussgesuch (TAG) wurde bei Ihrem lokalen Energieversorger eingereicht und wird nun geprueft.',
  },
  {
    key: 'TAG_BEWILLIGT',
    group: 'BEWILLIGUNGEN',
    label: 'TAG bewilligt',
    customerLabel: 'Anschlussgesuch bewilligt',
    description: 'Energieversorger hat zugestimmt',
    emailSubject: 'Anschlussgesuch bewilligt',
    emailBody: 'Ihr Energieversorger hat dem Technischen Anschlussgesuch zugestimmt. Damit ist der Netzanschluss vorbereitet.',
  },
  {
    key: 'IA_EINGEREICHT',
    group: 'BEWILLIGUNGEN',
    label: 'IA eingereicht',
    customerLabel: 'Installationsanzeige eingereicht',
    description: 'Anzeige beim Energieversorger eingereicht',
    emailSubject: 'Installationsanzeige eingereicht',
    emailBody: 'Die Installationsanzeige wurde beim Netzbetreiber eingereicht.',
  },
  {
    key: 'IA_BEWILLIGT',
    group: 'BEWILLIGUNGEN',
    label: 'IA bewilligt',
    customerLabel: 'Installationsanzeige bewilligt',
    description: 'Alle Bewilligungen liegen vor',
    emailSubject: 'Alle Bewilligungen liegen vor',
    emailBody: 'Saemtliche behoerdlichen Freigaben fuer Ihre PV-Anlage liegen nun vor. Wir koennen mit der Montage starten.',
  },
  {
    key: 'DC_MONTAGE_TERMIN',
    group: 'MONTAGE',
    label: 'DC-Montage Termin',
    customerLabel: 'Montagetermin geplant',
    description: 'Termin fuer die Modul-Montage steht',
    emailSubject: 'Ihr Montagetermin steht',
    emailBody: 'Wir haben einen Termin fuer die Montage Ihrer Solarmodule reserviert. Details folgen separat.',
  },
  {
    key: 'DC_MONTAGE_AUSGEFUEHRT',
    group: 'MONTAGE',
    label: 'DC-Montage ausgefuehrt',
    customerLabel: 'Solarmodule installiert',
    description: 'Module sind auf dem Dach montiert',
    emailSubject: 'Ihre Solarmodule sind montiert',
    emailBody: 'Grossartige Neuigkeiten! Ihre Solarmodule wurden erfolgreich auf dem Dach installiert. Als Naechstes folgt der Elektroanschluss.',
  },
  {
    key: 'AC_TERMIN',
    group: 'MONTAGE',
    label: 'AC-Termin',
    customerLabel: 'Elektroinstallation geplant',
    description: 'Termin fuer Wechselrichter und AC steht',
    emailSubject: 'Termin fuer Elektroinstallation',
    emailBody: 'Der Termin fuer die Elektroinstallation (Wechselrichter, AC-Anschluss) wurde geplant.',
  },
  {
    key: 'AC_INSTALLIERT',
    group: 'MONTAGE',
    label: 'AC installiert',
    customerLabel: 'Elektroinstallation abgeschlossen',
    description: 'Wechselrichter und AC sind angeschlossen',
    emailSubject: 'Elektroinstallation abgeschlossen',
    emailBody: 'Die Elektroinstallation Ihrer PV-Anlage ist abgeschlossen. Der Wechselrichter und alle elektrischen Verbindungen sind betriebsbereit.',
  },
  {
    key: 'GBA',
    group: 'INBETRIEBNAHME',
    label: 'GBA',
    customerLabel: 'GBA durchgefuehrt',
    description: 'Geraete-Bemessungs-Aenderung',
    emailSubject: 'GBA durchgefuehrt',
    emailBody: 'Die Geraete-Bemessungs-Aenderung (GBA) wurde erfolgreich durchgefuehrt.',
  },
  {
    key: 'SINA',
    group: 'INBETRIEBNAHME',
    label: 'SINA',
    customerLabel: 'Sicherheitsnachweis erstellt',
    description: 'Sicherheitsnachweis (SINA) liegt vor',
    emailSubject: 'Sicherheitsnachweis erstellt',
    emailBody: 'Der Sicherheitsnachweis (SINA) fuer Ihre Anlage wurde erstellt und beim Netzbetreiber eingereicht.',
  },
  {
    key: 'MPP',
    group: 'INBETRIEBNAHME',
    label: 'MPP',
    customerLabel: 'Mess- und Pruefprotokoll erstellt',
    description: 'Mess- und Pruefprotokoll abgeschlossen',
    emailSubject: 'Mess- und Pruefprotokoll erstellt',
    emailBody: 'Das Mess- und Pruefprotokoll (MPP) wurde erstellt. Ihre Anlage erfuellt alle technischen Anforderungen.',
  },
  {
    key: 'PRONOVO',
    group: 'INBETRIEBNAHME',
    label: 'Pronovo',
    customerLabel: 'Bei Pronovo angemeldet',
    description: 'Foerderbeitrag bei Pronovo beantragt',
    emailSubject: 'Bei Pronovo angemeldet',
    emailBody: 'Ihre Anlage wurde bei Pronovo angemeldet. Der Foerderbeitrag wird bearbeitet.',
  },
  {
    key: 'KOMPLETT_ERLEDIGT',
    group: 'ABSCHLUSS',
    label: 'Komplett erledigt',
    customerLabel: 'Anlage uebergeben',
    description: 'Ihre PV-Anlage ist komplett betriebsbereit',
    emailSubject: 'Ihre PV-Anlage ist betriebsbereit!',
    emailBody: 'Herzlichen Glueckwunsch! Ihre Photovoltaik-Anlage ist komplett installiert, geprueft und betriebsbereit. Vielen Dank fuer das Vertrauen in NeoSolar.',
  },
]

export function getMilestoneTemplate(key: string): MilestoneTemplate | undefined {
  return milestoneTemplates.find((m) => m.key === key)
}

export function getInitialMilestoneRows(projectId: string) {
  return milestoneTemplates.map((m, idx) => ({
    project_id: projectId,
    milestone_key: m.key,
    group_key: m.group,
    label: m.label,
    sort_order: idx,
    status: 'OPEN',
  }))
}
