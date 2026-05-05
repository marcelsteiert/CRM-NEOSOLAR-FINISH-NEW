import { Building2, Lock } from 'lucide-react'
import InternalDocumentSection from '@/components/ui/InternalDocumentSection'

export default function CompanyVaultPage() {
  return (
    <div className="space-y-5 max-w-[1100px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 size={20} strokeWidth={1.8} />
            Firmenablage
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, #F87171 12%, transparent)', color: '#F87171' }}>
              <Lock size={9} strokeWidth={2.5} />
              Nur Admin
            </span>
          </h1>
          <p className="text-[11px] text-text-dim mt-0.5 hidden sm:block">
            Wichtige firmen-interne Dokumente: Statuten, Versicherungen, Lieferantenverträge, Buchhaltung etc.
          </p>
        </div>
      </div>

      <div className="glass-card p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <InternalDocumentSection />
      </div>
    </div>
  )
}
