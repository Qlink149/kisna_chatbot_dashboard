import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Receipt, RotateCw } from 'lucide-react'
import { listWalletCharges, retryWalletCharges } from '@/lib/api'
import { CHARGE_STATUSES, formatCount, formatIST, formatRupees, statusTotal, unconfirmedCount } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBox, Pager, Pill, Section, SkeletonRows, Th } from './parts'
import { useDebouncedValue } from './useDebouncedValue'

const LIMIT = 20
const COLS = 8
const STATUS_LABEL = { PENDING: 'Pending', STUCK: 'Stuck', REJECTED: 'Rejected', CHARGED: 'Charged', SHADOW: 'Shadow' }
const STATUS_TONE = { PENDING: 'amber', STUCK: 'red', REJECTED: 'red', CHARGED: 'green', SHADOW: 'blue' }
const SOURCE_LABEL = { live: 'Live', reconcile: 'Reconcile', backfill: 'Backfill' }

export function ChargesTable({ summary }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [page, setPage] = useState(1)
  const phone = useDebouncedValue(phoneInput.replace(/\D/g, ''), 300)
  const filterKey = `${status}|${phone}`
  const [lastKey, setLastKey] = useState(filterKey)
  if (filterKey !== lastKey) { setLastKey(filterKey); setPage(1) }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wallet', 'charges', status, phone, page],
    queryFn: () => listWalletCharges({ status, phone, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.items || []
  const total = data?.total ?? 0
  const byStatus = summary?.by_status || {}
  const unconfirmed = unconfirmedCount(byStatus)

  const retry = useMutation({
    mutationFn: retryWalletCharges,
    onSuccess: res => {
      toast.success(`Retried ${formatCount(res?.tried)} charge${res?.tried === 1 ? '' : 's'} · ${formatCount(res?.brought_forward)} brought forward`)
      queryClient.invalidateQueries({ queryKey: ['wallet', 'summary'] })
      queryClient.invalidateQueries({ queryKey: ['wallet', 'charges'] })
    },
    onError: e => toast.error(e.message || 'Retry failed'),
  })

  const tabs = [{ id: '', label: 'All', count: statusTotal(byStatus) }, ...CHARGE_STATUSES.map(s => ({ id: s, label: STATUS_LABEL[s], count: byStatus[s] }))]

  return (
    <Section
      title="Charges"
      icon={Receipt}
      flush
      action={unconfirmed > 0 && (
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => retry.mutate()} disabled={retry.isPending}>
          <RotateCw className={`mr-1 h-3.5 w-3.5 ${retry.isPending ? 'animate-spin' : ''}`} />
          {retry.isPending ? 'Retrying…' : `Retry unconfirmed now (${formatCount(unconfirmed)})`}
        </Button>
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 px-4">
        {tabs.map(t => (
          <button
            key={t.id || 'all'}
            type="button"
            onClick={() => setStatus(t.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === t.id
                ? 'border-[rgb(var(--violet-rgb)/0.4)] bg-[rgb(var(--violet-rgb)/0.08)] text-[var(--violet)]'
                : 'border-border bg-white text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {t.label} <span className="tabular-nums opacity-70">{formatCount(t.count ?? 0)}</span>
          </button>
        ))}
        <Input
          className="h-8 w-full bg-white text-xs sm:ml-auto sm:w-48"
          placeholder="Filter by phone"
          inputMode="numeric"
          value={phoneInput}
          onChange={e => setPhoneInput(e.target.value)}
          aria-label="Filter charges by phone"
        />
      </div>

      {isError ? (
        <div className="px-4 pb-4"><ErrorBox>{error?.message || 'Couldn’t load charges'}</ErrorBox></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                  <Th>Time</Th><Th>Phone</Th><Th right>Bundle</Th><Th>Status</Th>
                  <Th>Source</Th><Th right>Amount</Th><Th right>Attempts</Th><Th>Last error</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <SkeletonRows cols={COLS} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLS} className="px-4 py-10 text-center text-muted-foreground">No charges found</td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr key={r.wallet_id} className="hover:bg-[rgb(var(--violet-rgb)/0.04)]">
                      <td className="px-4 py-3 cell-muted whitespace-nowrap text-xs">
                        <div>{formatIST(r.created_at)}</div>
                        {r.charged_at ? <div>Charged {formatIST(r.charged_at)}</div> : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.phone}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(r.bundle)}</td>
                      <td className="px-4 py-3"><Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status] || r.status}</Pill></td>
                      <td className="px-4 py-3 cell-muted text-xs">{SOURCE_LABEL[r.source] || r.source || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatRupees(r.amount_rupees)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(r.attempts)}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-red-700" title={r.last_error || ''}>{r.last_error || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />
        </>
      )}
    </Section>
  )
}
