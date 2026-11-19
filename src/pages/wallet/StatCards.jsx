import { CalendarDays, CalendarRange, Clock, TrendingUp } from 'lucide-react'
import { formatCount, formatRupees, relativeTime, runwayText, unconfirmedCount } from '@/lib/wallet'

function Card({ icon, label, value, lines }) {
  const Icon = icon
  return (
    <div className="executive-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.filter(Boolean).map(l => <p key={l}>{l}</p>)}
      </div>
    </div>
  )
}

// messages is null when the server has no exact count; then it is left out.
// Backfill rows are not in today / month (they show in the Backfill card).
const periodLines = (p, shadow) => [
  p?.messages == null
    ? `${formatCount(p?.bundles)} bundles`
    : `${formatCount(p?.bundles)} bundles · ${formatCount(p.messages)} messages`,
  shadow ? 'What would be charged (shadow)' : null,
]

// client: Today, This month and Avg daily spend only (the Unconfirmed card is
// internal ledger plumbing).
export function StatCards({ summary, client = false }) {
  // The client never sees shadow wording (the server doesn't even send them the mode).
  const shadow = !client && summary.mode === 'shadow'
  const unconfirmed = unconfirmedCount(summary.by_status)
  const oldest = summary.oldest_pending_at
  // The client's usage from 1 Sep up to go-live, billed once at go-live: shown as
  // one card so the drop in their balance that day is explained.
  const opening = client && summary.backfill?.applied ? summary.backfill : null
  const cols = client ? (opening ? 'xl:grid-cols-4' : 'xl:grid-cols-3') : 'xl:grid-cols-4'
  return (
    <div className={`mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${cols}`}>
      {opening && (
        <Card
          icon={CalendarRange}
          label="Usage before billing started"
          value={formatRupees(opening.amount_rupees)}
          lines={[`${formatCount(opening.bundles)} bundles, 1 Sep up to go-live`, 'Charged once when billing started']}
        />
      )}
      <Card icon={CalendarDays} label="Today" value={formatRupees(summary.today?.amount_rupees)} lines={periodLines(summary.today, shadow)} />
      <Card icon={CalendarRange} label="This month" value={formatRupees(summary.month?.amount_rupees)} lines={periodLines(summary.month, shadow)} />
      {!client && <Card
        icon={Clock}
        label="Unconfirmed"
        value={formatRupees(summary.owed_unconfirmed_rupees)}
        lines={[
          `${formatCount(unconfirmed)} charge${unconfirmed === 1 ? '' : 's'} pending or stuck`,
          oldest ? `Oldest one queued ${relativeTime(oldest)}` : 'Nothing waiting',
        ]}
      />}
      <Card
        icon={TrendingUp}
        label="Avg daily spend"
        value={formatRupees(summary.avg_daily_spend_rupees)}
        lines={[client ? 'Last 7 days' : 'Last 7 days, backfill not included', runwayText(summary.runway_days)]}
      />
    </div>
  )
}
