import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { listComplaints } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { safeFormatDate } from '@/pages/users/utils'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

const KISNA_COMPLAINT_TYPES = {
  '0_Want_to_Buy': { label: 'Want to Buy', color: 'blue' },
  '1_Order_Related': { label: 'Order Related', color: 'orange' },
  '2_Payment_Related': { label: 'Payment Related', color: 'purple' },
  '3_Stores_Related': { label: 'Stores Related', color: 'blue' },
  '4_Returns_Related': { label: 'Returns Related', color: 'yellow' },
  '5_Exchange_Buyback': { label: 'Exchange/Buyback', color: 'purple' },
  '6_Digital_Gold': { label: 'Digital Gold', color: 'orange' },
  '7_Kisna_Points': { label: 'Kisna Points', color: 'blue' },
  '8_10_Plus_1_Monthly_Plan': { label: '10+1 Monthly Plan', color: 'green' },
  '9_Other': { label: 'Other', color: 'red' },
  // Legacy complaint flow IDs (pre-migration)
  '0_Delayed_Delivery': { label: 'Delayed Delivery', color: 'orange' },
  '1_Order_Cancellation': { label: 'Order Cancellation', color: 'red' },
  '2_Wrong_Item_Delivered': { label: 'Wrong Item Delivered', color: 'red' },
  '3_Damaged_Defective_Product': { label: 'Damaged / Defective Item', color: 'red' },
  '4_Making_Charges_Dispute': { label: 'Making Charges Dispute', color: 'purple' },
  '5_Return_Refund_Request': { label: 'Return & Refund', color: 'yellow' },
  '6_Modification_Request': { label: 'Order Modification', color: 'blue' },
  '7_Order_Tracking_Escalation': { label: 'Tracking Escalation', color: 'orange' },
}

const TYPE_COLOR_CLASSES = {
  orange: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  red: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
  blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  green: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
}

const STATUS_COLOR_CLASSES = {
  registered: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  crm_pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
  resolved: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  pending: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
}

function ComplaintTypeBadge({ type }) {
  const meta = KISNA_COMPLAINT_TYPES[type]
  const label = meta?.label || type || 'Unknown'
  const cls = TYPE_COLOR_CLASSES[meta?.color] || 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  const value = status || 'pending'
  const cls = STATUS_COLOR_CLASSES[value] || STATUS_COLOR_CLASSES.pending
  const label = value.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}

const COLUMN_COUNT = 10

function RowSkeleton() {
  return (
    <tr className="border-b">
      {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
        <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  )
}

export default function ComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 20

  const setPage = (val) => setSearchParams({ page: String(val) }, { replace: true })

  const [complaints, setComplaints] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(total / limit) || 1

  const fetchComplaints = useCallback(() => {
    setLoading(true)
    listComplaints(page, limit)
      .then(res => {
        setComplaints(res?.complaints || [])
        setTotal(res?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, limit])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  return (
    <div>
      <PageHeader
        title="Complaints"
        description={`${total} total complaint${total !== 1 ? 's' : ''} filed through WhatsApp`}
      />

      <div className="executive-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Reg. Mobile</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Reg. Email/Contact</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Invoice No.</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Case ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="px-4 py-16 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No complaints found.
                  </td>
                </tr>
              ) : (
                complaints.map((c, i) => (
                  <tr key={c.case_id || c.case_no || i} className="hover:bg-[rgb(var(--violet-rgb)/0.04)] transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/users?phone=${c.phone_number}`}
                        className="group"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {c.customer_name || c.username || 'Unknown'}
                        </p>
                        <p className="text-[11px] cell-muted font-mono">+{c.phone_number}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs cell-muted">
                      {c.order_id || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs cell-muted whitespace-nowrap">
                      {c.registered_mobile || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs cell-muted whitespace-nowrap">
                      {c.registered_contact || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs cell-muted whitespace-nowrap">
                      {c.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs cell-muted">
                      {c.case_id || c.case_no || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ComplaintTypeBadge type={c.type || c.complaint_type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs cell-muted line-clamp-2">{c.issue || c.issue_description || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] cell-muted whitespace-nowrap">
                      {safeFormatDate(c.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">{total} complaint{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setPage(page - 1)} disabled={page === 1 || loading}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium min-w-12 text-center">{page}/{totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setPage(page + 1)} disabled={page >= totalPages || loading}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
