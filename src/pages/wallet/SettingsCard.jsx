import { formatCount, formatRupees } from '@/lib/wallet'

const phoneList = list => (list?.length ? list.join(', ') : 'None')

// Read-only: these are set on the server.
export function SettingsCard({ summary }) {
  return (
    <section className="executive-card-soft mb-4 p-4 text-xs text-muted-foreground">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider">Settings (read-only)</h2>
      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
        <dt>Bundle</dt>
        <dd>{formatCount(summary.bundle_size)} messages for {formatRupees(summary.bundle_price_rupees)}</dd>
        <dt>Exempt numbers</dt>
        <dd className="break-all font-mono">{phoneList(summary.exempt_phones)}</dd>
        <dt>Live test numbers</dt>
        <dd className="break-all font-mono">{phoneList(summary.live_phones)}</dd>
      </dl>
    </section>
  )
}
