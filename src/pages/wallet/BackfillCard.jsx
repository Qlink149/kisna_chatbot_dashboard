import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { History } from 'lucide-react'
import { getBackfillEstimate, startBackfillEstimate } from '@/lib/api'
import { formatCount, formatIST, formatRupees } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBox, Pill, Section } from './parts'

const ESTIMATE_KEY = ['wallet', 'backfill-estimate']
const DEFAULT_SINCE = '2026-09-01'

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function BackfillCard({ backfill }) {
  const queryClient = useQueryClient()
  const [since, setSince] = useState(DEFAULT_SINCE)

  // Polls every 3s only while an estimate is running.
  const estimate = useQuery({
    queryKey: ESTIMATE_KEY,
    queryFn: getBackfillEstimate,
    refetchInterval: q => (q.state.data?.status === 'running' ? 3000 : false),
  })

  const start = useMutation({
    mutationFn: () => startBackfillEstimate(since),
    onSuccess: res => queryClient.setQueryData(ESTIMATE_KEY, res),
    onError: e => toast.error(e.message || 'Could not start the estimate'),
  })

  const est = estimate.data
  const running = est?.status === 'running'
  const result = est?.result
  const b = backfill || {}

  return (
    <Section title="Backfill" icon={History}>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {b.applied ? (
          <>
            <Pill tone="green">Applied</Pill>
            <span className="text-muted-foreground">{formatIST(b.applied_at, { withYear: true })}</span>
            <span><span className="font-semibold tabular-nums">{formatRupees(b.amount_rupees)}</span> for {formatCount(b.bundles)} bundles</span>
            <span className="text-muted-foreground">{formatCount(b.charged)} charged · {formatCount(b.pending)} pending</span>
          </>
        ) : (
          <>
            <Pill>Not applied</Pill>
            <span className="text-muted-foreground">No backfill has been charged.</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="mb-1 block font-medium">Estimate amount since</span>
          <Input type="date" className="h-8 w-44 bg-white text-xs" value={since} onChange={e => setSince(e.target.value)} />
        </label>
        <Button size="sm" className="h-8 text-xs" disabled={!since || running || start.isPending} onClick={() => start.mutate()}>
          {running ? 'Estimating…' : start.isPending ? 'Starting…' : 'Estimate'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        This only counts what a backfill would charge. It is read-only and nothing is charged.
      </p>

      <div className="mt-3">
        {estimate.isError ? (
          <ErrorBox>{estimate.error?.message || 'Couldn’t load the estimate'}</ErrorBox>
        ) : est?.status === 'error' ? (
          <ErrorBox>The estimate failed{est.error ? `: ${est.error}` : '.'}</ErrorBox>
        ) : running ? (
          <p className="text-xs text-muted-foreground">Counting messages since {est.since}… started {formatIST(est.started_at)}.</p>
        ) : null}

        {result && (
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Figure label="Customers" value={formatCount(result.customers)} />
              <Figure label="Messages" value={formatCount(result.messages)} />
              <Figure label="Free" value={formatCount(result.free)} />
              <Figure label="Bundles" value={formatCount(result.bundles)} />
              <Figure label="Amount" value={formatRupees(result.amount_rupees)} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {running
                ? 'From the last finished run'
                : `Since ${est.since}${est.finished_at ? ` · finished ${formatIST(est.finished_at, { withYear: true })}` : ''}`}
            </p>
          </div>
        )}
      </div>
    </Section>
  )
}
