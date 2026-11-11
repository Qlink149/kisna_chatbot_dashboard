import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { getWalletDaily } from '@/lib/api'
import { dailyBars, formatCount, formatDay, formatRupees } from '@/lib/wallet'
import { BRAND_COLORS } from '@/components/charts/brandChartTheme'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox, Section } from './parts'

const COLORS = { charged: BRAND_COLORS.primary, shadow: BRAND_COLORS.lavender, other: BRAND_COLORS.warning }

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  )
}

export function DailyChart() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['wallet', 'daily', 30], queryFn: () => getWalletDaily(30) })
  const bars = dailyBars(data?.days)
  const total = bars.reduce((s, b) => s + b.amount, 0)
  const has = key => bars.some(b => b[key] > 0)

  return (
    <Section
      title="Last 30 days"
      icon={BarChart3}
      action={!isLoading && !isError && <span className="text-xs text-muted-foreground">{formatRupees(total)} in total</span>}
    >
      {isError ? (
        <ErrorBox>{error?.message || 'Couldn’t load the daily figures'}</ErrorBox>
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : bars.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No days to show yet.</p>
      ) : (
        <>
          <ul className="flex h-40 items-end gap-[2px] sm:gap-1" aria-label="Amount per day">
            {bars.map(b => {
              const label = `${formatDay(b.date)}: ${formatCount(b.bundles)} bundles, ${formatRupees(b.amount)}`
                + (b.charged || b.shadow ? ` (${b.charged} charged, ${b.shadow} shadow)` : '')
              return (
                <li key={b.date} title={label} aria-label={label} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm group-hover:opacity-80"
                    style={{ height: `${b.chargedPct + b.shadowPct + b.otherPct}%`, minHeight: b.amount > 0 ? 2 : 0 }}
                  >
                    <div style={{ flexGrow: b.chargedPct, background: COLORS.charged }} />
                    <div style={{ flexGrow: b.shadowPct, background: COLORS.shadow }} />
                    <div style={{ flexGrow: b.otherPct, background: COLORS.other }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{formatDay(bars[0].date)}</span>
            <span>{formatDay(bars[bars.length - 1].date)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {has('chargedPct') && <Legend color={COLORS.charged} label="Charged" />}
            {has('shadowPct') && <Legend color={COLORS.shadow} label="Shadow (not charged)" />}
            {has('otherPct') && <Legend color={COLORS.other} label="Pending / other" />}
            <span>Hover a bar for the date, bundles and amount. Backfill is not included.</span>
          </div>
        </>
      )}
    </Section>
  )
}
