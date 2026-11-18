import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { listWalletInvoices } from '@/lib/api'
import { formatIST, formatRupees, isoToEpoch } from '@/lib/wallet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBox, Section, Th } from './parts'

// Invoice total = wallet credit + 18% GST. What the client actually paid also
// covers the payment gateway's fee and its GST (added at checkout), so both are
// shown: "invoice Rs 118 but I paid Rs 121.07" answers itself.
// client: no internal storage path.
export function InvoicesCard({ client = false }) {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['wallet', 'invoices'], queryFn: listWalletInvoices })
  const rows = data?.available ? [...(data.rows || [])].sort((a, b) => String(b.invoice_no).localeCompare(String(a.invoice_no))) : []

  let body
  if (isError) body = <ErrorBox>{error?.message || 'Couldn’t load invoices'}</ErrorBox>
  else if (isLoading) body = <Skeleton className="h-16 w-full" />
  else if (!data?.available) body = <p className="text-xs text-muted-foreground">Invoices appear here once the wallet service provides them.</p>
  else if (!rows.length) body = <p className="text-xs text-muted-foreground">No invoices yet. Each top-up creates one and emails it to you.</p>
  else body = (
    <>
      <div className="-mx-4 overflow-x-auto">
        <table className="dashboard-table w-full text-sm">
          <thead>
            <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
              <Th>Invoice no.</Th><Th right>Wallet credit</Th><Th right>GST 18%</Th><Th right>Invoice total</Th>
              <Th right>Paid</Th><Th>Emailed</Th>{!client && <Th>PDF file</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map(r => {
              const emailed = isoToEpoch(r.emailed_at)
              const gateway = Number(r.gateway_charges_rupees || 0)
              return (
                <tr key={r.invoice_no}>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.invoice_no}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatRupees(r.taxable_rupees)}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatRupees(r.gst_rupees)}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-medium">{formatRupees(r.total_rupees)}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <div>{formatRupees(r.paid_rupees ?? r.total_rupees)}</div>
                    {gateway > 0 && (
                      <div className="text-[11px] text-muted-foreground">incl. {formatRupees(gateway)} gateway charges</div>
                    )}
                  </td>
                  <td className="px-4 py-3 cell-muted whitespace-nowrap text-xs">{emailed ? formatIST(emailed) : 'Not emailed'}</td>
                  {!client && <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.pdf_location || '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        The invoice is for the wallet credit plus 18% GST. The amount paid also covers the payment gateway&rsquo;s fee and the GST on it, added at checkout.
      </p>
    </>
  )

  return <Section title="Invoices" icon={FileText}>{body}</Section>
}
