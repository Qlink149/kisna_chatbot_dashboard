import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatIST, formatRupees, modeLabel, relativeTime, runwayText, walletStatusLabel } from '@/lib/wallet'
import { Pill } from './parts'

const MODE_TONE = { off: 'grey', shadow: 'blue', live: 'green' }
const STATUS_TONE = { ACTIVE: 'green', PAUSED: 'red' }

function Banner({ tone, children }) {
  const cls = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-800'
  return <div className={`rounded-md border px-3 py-2 text-xs ${cls}`} role="alert">{children}</div>
}

export function StatusStrip({ summary, onRefresh, refreshing }) {
  const wallet = summary.wallet || {}
  const livePhones = summary.live_phones || []
  const liveTest = summary.mode === 'shadow' && livePhones.length > 0

  return (
    <div className="mb-4 space-y-2">
      <div className="executive-card-soft flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Billing</span>
          <Pill tone={MODE_TONE[summary.mode]}>{modeLabel(summary.mode)}</Pill>
          {liveTest && (
            <Pill tone="green">
              Live for {livePhones.length} test number{livePhones.length === 1 ? '' : 's'} only
            </Pill>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Wallet</span>
          <Pill tone={STATUS_TONE[wallet.status]}>{walletStatusLabel(wallet.status)}</Pill>
          <span className="text-sm font-semibold tabular-nums">{formatRupees(wallet.balance_rupees)}</span>
        </div>
        <span className="text-muted-foreground">
          Last updated {wallet.updated_at ? `${relativeTime(wallet.updated_at)} · ${formatIST(wallet.updated_at)}` : 'never'}
        </span>
        <Button size="sm" variant="outline" className="ml-auto h-8 text-xs" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {wallet.status === 'PAUSED' && (
        <Banner tone="red">The wallet is paused. Live charges are not going through until it is active again.</Banner>
      )}
      {summary.outage_cap_reached && (
        <Banner tone="red">New charges stopped: wallet not confirming.</Banner>
      )}
      {summary.low_balance && (
        <Banner tone="amber">
          Low balance: {formatRupees(wallet.balance_rupees)}. {runwayText(summary.runway_days)} at the current spend. Please top up.
        </Banner>
      )}
      {wallet.unreachable_since && (
        <Banner tone="amber">
          The wallet service hasn’t answered since {formatIST(wallet.unreachable_since)} ({relativeTime(wallet.unreachable_since)}).
          The balance shown may be out of date.
        </Banner>
      )}
    </div>
  )
}
