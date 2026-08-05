import { Users, ShieldCheck, Sparkles, Clock } from 'lucide-react'

const BILD = '/praesentation'

/**
 * Umsetzung in einer Folie.
 *
 * Vorher standen Montage, Ablauf und Zeitplan als drei Folien
 * hintereinander und wiederholten sich gegenseitig. Am Ende eines
 * Beratungstermins ist die Aufmerksamkeit knapp – der Kunde braucht hier
 * eine Antwort: Was passiert wann, und wer macht es. Das passt auf ein
 * Blatt.
 */
export function FolienUmsetzung() {
  const schritte = [
    { titel: 'Beratung', text: 'Heute: Fragen klären, Anlage planen, Richtofferte.', dauer: 'heute' },
    { titel: 'Vermessung', text: 'Drohnenflug, Ausführungsplanung, verbindlicher Festpreis.', dauer: '1–2 Wochen' },
    { titel: 'Bewilligung', text: 'Baugesuch, Netzanmeldung, Förderantrag – machen wir.', dauer: 'läuft parallel' },
    { titel: 'Montage', text: 'Gerüst, Module, Elektroanschluss durch unser eigenes Team.', dauer: 'wenige Tage' },
    { titel: 'Inbetriebnahme', text: 'Anlage läuft, Dokumentation und App eingerichtet.', dauer: 'fertig' },
  ]

  const zusagen = [
    { icon: Users, text: 'Eigenes Montageteam – keine wechselnden Subunternehmer' },
    { icon: ShieldCheck, text: 'Gerüst und Absturzsicherung im Preis enthalten' },
    { icon: Sparkles, text: 'Wir räumen die Baustelle auf, als wären wir nie da gewesen' },
  ]

  return (
    <div className="h-full flex flex-col justify-center px-6 sm:px-10 max-w-6xl mx-auto w-full">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber mb-2">Die Umsetzung</p>
      <h2 className="text-[28px] sm:text-[33px] font-bold text-text mb-2 leading-tight">
        Von heute bis zur laufenden Anlage
      </h2>
      <div className="flex items-center gap-2 text-[13px] text-text-sec mb-6">
        <Clock size={14} strokeWidth={1.9} className="text-amber shrink-0" />
        Maximal zwei Monate ab Vertragsunterzeichnung – Sie haben einen Ansprechpartner
        und koordinieren nichts selbst.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,34%)_minmax(0,1fr)] gap-6 items-center min-h-0">
        {/* Bild – zeigt, wer aufs Dach kommt */}
        <div className="hidden lg:block min-h-0">
          <img
            src={`${BILD}/montage.jpg`}
            alt="Montage einer Solaranlage"
            className="w-full object-cover"
            style={{
              maxHeight: '44vh',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)',
              filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.5))',
            }}
            loading="lazy"
          />
          <p className="text-[10px] text-text-dim mt-2 px-1">Symbolbild</p>
        </div>

        {/* Ablauf */}
        <div className="space-y-1 min-w-0">
          {schritte.map((s, i) => (
            <div key={s.titel} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-amber shrink-0"
                  style={{
                    background: 'color-mix(in srgb, #F59E0B 14%, transparent)',
                    border: '1px solid color-mix(in srgb, #F59E0B 32%, transparent)',
                  }}
                >
                  {i + 1}
                </div>
                {i < schritte.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'rgba(255,255,255,0.10)' }} />
                )}
              </div>
              <div className="pb-3 pt-0.5 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-text">{s.titel}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: i === schritte.length - 1 ? '#34D399' : '#94A3B8',
                    }}
                  >
                    {s.dauer}
                  </span>
                </div>
                <div className="text-[12px] text-text-dim leading-snug">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Was wir zusagen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
        {zusagen.map((z) => (
          <div
            key={z.text}
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <z.icon size={15} strokeWidth={1.8} className="text-emerald shrink-0 mt-0.5" />
            <span className="text-[11.5px] text-text-sec leading-snug">{z.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FolienUmsetzung
