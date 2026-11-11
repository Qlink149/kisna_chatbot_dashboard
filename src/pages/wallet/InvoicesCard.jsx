import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { listWalletInvoices } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox, Section, Th } from './parts'

// Rows come through as the wallet service sends them, so the columns are
// whatever keys they carry; links open in a new tab.
const cell = value => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  if (/^https?:\/\//.test(text)) {
    return <a href={text} target="_blank" rel="noreferrer" className="text-[var(--violet)] hover:underline">Open</a>
  }
  return text
}

export function InvoicesCard() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['wallet', 'invoices'], queryFn: listWalletInvoices })
  const rows = data?.available ? data.rows || [] : []
  const columns = rows.length ? Object.keys(rows[0]) : []

  let body
  if (isError) body = <ErrorBox>{error?.message || 'Couldn’t load invoices'}</ErrorBox>
  else if (isLoading) body = <Skeleton className="h-16 w-full" />
  else if (!data?.available) body = <p className="text-xs text-muted-foreground">Invoices appear here once the wallet service provides them.</p>
  else if (!rows.length) body = <p className="text-xs text-muted-foreground">No invoices yet.</p>
  else body = (
    <div className="-mx-4 overflow-x-auto">
      <table className="dashboard-table w-full text-sm">
        <thead>
          <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
            {columns.map(c => <Th key={c}>{c.replace(/_/g, ' ')}</Th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((r, i) => (
            <tr key={r.id ?? r.invoice_id ?? i}>
              {columns.map(c => <td key={c} className="px-4 py-3 text-xs">{cell(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return <Section title="Invoices" icon={FileText}>{body}</Section>
}
