import { Handshake, Gift, Phone, Mail, CalendarCheck, Sun } from 'lucide-react'

/**
 * Die letzte Folie.
 *
 * Vorher stand hier "Haben Sie noch Fragen?" – eine Frage, die am Ende
 * eines guten Gesprächs Zweifel weckt, wo keine waren. Jetzt steht hier
 * eine Aussage: Wir freuen uns auf die Zusammenarbeit.
 */
export function FolienStart({
  kunde,
  berater,
  beraterMail,
  beraterTel,
}: {
  kunde?: string
  berater?: string
  beraterMail?: string
  beraterTel?: string
}) {
  return (
    <div className="h-full overflow-y-auto flex flex-col justify-center px-6 sm:px-10 py-8 max-w-4xl mx-auto w-full">
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'color-mix(in srgb, #F59E0B 14%, transparent)',
            border: '1px solid color-mix(in srgb, #F59E0B 35%, transparent)',
          }}
        >
          <Handshake size={30} strokeWidth={1.6} className="text-amber" />
        </div>
        <h2 className="text-[32px] sm:text-[42px] font-bold text-text leading-tight mb-4">
          Ich freue mich, mit Ihnen
          <br />
          zu starten{kunde ? `, ${kunde}` : ''}.
        </h2>
        <p className="text-[15px] text-text-sec leading-relaxed max-w-2xl mx-auto">
          Sie wissen jetzt, was Ihr Dach leisten kann, was es kostet und was Sie dafür bekommen.
          Der nächste Schritt gehört Ihnen – und wir sind ab dann dran.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: CalendarCheck, titel: 'Sie sagen zu', text: 'Ein Wort genügt, den Rest übernehmen wir' },
          { icon: Sun, titel: 'Wir vermessen', text: 'Drohnenaufnahme und finaler Festpreis' },
          { icon: Handshake, titel: 'Wir bauen', text: 'Ab Bewilligung höchstens zwei Monate' },
        ].map((s) => (
          <div
            key={s.titel}
            className="p-5 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <s.icon size={20} strokeWidth={1.6} className="text-amber mx-auto mb-2.5" />
            <div className="text-[14px] font-bold text-text mb-1">{s.titel}</div>
            <div className="text-[11px] text-text-dim leading-snug">{s.text}</div>
          </div>
        ))}
      </div>

      {/* Empfehlungspraemie */}
      <div
        className="p-5 rounded-2xl mb-6"
        style={{
          background: 'color-mix(in srgb, #34D399 9%, transparent)',
          border: '1px solid color-mix(in srgb, #34D399 28%, transparent)',
        }}
      >
        <div className="flex items-start gap-4">
          <Gift size={22} strokeWidth={1.7} className="text-emerald shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2.5 mb-1">
              <h3 className="text-[15px] font-bold text-text">Kennen Sie jemanden?</h3>
              <span className="text-[20px] font-bold text-emerald tabular-nums">CHF 200</span>
            </div>
            <p className="text-[12px] text-text-sec leading-relaxed">
              Für jede Empfehlung, aus der eine Anlage wird, erhalten Sie 200 Franken – ohne
              Obergrenze. Nachbarn, Verwandte, Arbeitskollegen: Sagen Sie uns einfach Bescheid,
              wir melden uns bei ihnen.
            </p>
          </div>
        </div>
      </div>

      {berater && (
        <div
          className="p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-2">
            Ihr Ansprechpartner
          </div>
          <div className="text-[17px] font-bold text-text mb-2">{berater}</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-text-sec">
            {beraterTel && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} strokeWidth={1.8} className="text-amber" />
                {beraterTel}
              </span>
            )}
            {beraterMail && (
              <span className="flex items-center gap-1.5">
                <Mail size={13} strokeWidth={1.8} className="text-amber" />
                {beraterMail}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
