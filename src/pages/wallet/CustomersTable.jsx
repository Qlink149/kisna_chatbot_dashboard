import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Users } from 'lucide-react'
import { exportWalletCustomersCsv, listWalletCustomers } from '@/lib/api'
import { formatCount, formatIST, formatRupees, relativeTime } from '@/lib/wallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBox, Pager, Pill, Section, SkeletonRows, Th } from './parts'
import { useDebouncedValue } from './useDebouncedValue'

const LIMIT = 20
const COLS = 8

export function CustomersTable() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const q = useDebouncedValue(search.trim(), 300)
  // A new search starts again from page 1.
  const [lastQ, setLastQ] = useState(q)
  if (q !== lastQ) { setLastQ(q); setPage(1) }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wallet', 'customers', q, page],
    queryFn: () => listWalletCustomers({ q, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.items || []
  const total = data?.total ?? 0

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportWalletCustomersCsv(q)
    } catch (e) {
      toast.error(e.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Section
      title={`Customers${data ? ` · ${formatCount(total)}` : ''}`}
      icon={Users}
      flush
      action={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Input
            className="h-8 w-full bg-white text-xs sm:w-64"
            placeholder="Search phone or name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search customers"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1 h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      }
    >
      {isError ? (
        <div className="px-4 pb-4"><ErrorBox>{error?.message || 'Couldn’t load customers'}</ErrorBox></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                  <Th>Phone</Th><Th>Name</Th><Th right>Messages</Th><Th right>Bundles</Th>
                  <Th right>Amount</Th><Th right>Left in bundle</Th><Th>Last message</Th><Th>Live</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <SkeletonRows cols={COLS} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLS} className="px-4 py-10 text-center text-muted-foreground">
                      {q ? 'No customers match that search' : 'No customers yet'}
                    </td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr key={r.phone} className="hover:bg-[rgb(var(--violet-rgb)/0.04)]">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.phone}</td>
                      <td className="px-4 py-3">{r.name || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(r.messages)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(r.bundles)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatRupees(r.amount_rupees)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCount(r.paid_left)}</td>
                      <td className="px-4 py-3 cell-muted whitespace-nowrap text-xs">
                        <div>{formatIST(r.last_message_at)}</div>
                        <div>{relativeTime(r.last_message_at)}</div>
                      </td>
                      <td className="px-4 py-3">{r.live ? <Pill tone="green">Live</Pill> : <span className="text-xs text-muted-foreground">—</span>}</td>
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
