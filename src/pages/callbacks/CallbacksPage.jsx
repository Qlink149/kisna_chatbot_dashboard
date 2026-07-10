import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { listCallbacks, updateCallbackStatus } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { safeFormatDate } from '@/pages/users/utils'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'

const TYPE_LABELS = {
  callback: 'Callback',
  video_call: 'Video Call',
}

const REASON_LABELS = {
  product_enquiry: 'Product Enquiry',
  order_support: 'Order Support',
  store_assistance: 'Store Assistance',
  exchange_return: 'Exchange/Return',
  other: 'Other',
}

const TIME_LABELS = {
  morning: 'Morning (10 AM–1 PM)',
  afternoon: 'Afternoon (1 PM–5 PM)',
}

const TYPE_COLOR_CLASSES = {
  callback: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  video_call: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
}

const STATUS_COLOR_CLASSES = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
  completed: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'callback', label: 'Callback', request_type: 'callback' },
  { id: 'video_call', label: 'Video Call', request_type: 'video_call' },
  { id: 'pending', label: 'Pending', status: 'pending' },
  { id: 'completed', label: 'Completed', status: 'completed' },
]

function TypeBadge({ type }) {
  const label = TYPE_LABELS[type] || type || 'Unknown'
  const cls = TYPE_COLOR_CLASSES[type] || 'bg-zinc-100 text-zinc-600 border-zinc-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  const value = status || 'pending'
  const cls = STATUS_COLOR_CLASSES[value] || STATUS_COLOR_CLASSES.pending
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cls}`}>
      {value}
    </span>
  )
}

function RowSkeleton() {
  return (
    <tr className="border-b">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  )
}

export default function CallbacksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const filter = searchParams.get('filter') || 'all'
  const limit = 20

  const setPage = (val) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(val))
    setSearchParams(next, { replace: true })
  }

  const setFilter = (id) => {
    setSearchParams({ filter: id, page: '1' }, { replace: true })
  }

  const [callbacks, setCallbacks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const chip = FILTER_CHIPS.find(c => c.id === filter) || FILTER_CHIPS[0]
  const apiFilters = {}
  if (chip.status) apiFilters.status = chip.status
  if (chip.request_type) apiFilters.request_type = chip.request_type

  const totalPages = Math.ceil(total / limit) || 1

  const fetchCallbacks = useCallback(() => {
    setLoading(true)
    listCallbacks(page, limit, apiFilters)
      .then(res => {
        setCallbacks(res?.callbacks || [])
        setTotal(res?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, limit, filter])

  useEffect(() => {
    fetchCallbacks()
  }, [fetchCallbacks])

  const handleMarkCompleted = async (requestId) => {
    setUpdatingId(requestId)
    try {
      await updateCallbackStatus(requestId, 'completed')
      fetchCallbacks()
    } catch {
      // toast handled by api layer redirect on auth errors
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Callbacks"
        description={`${total} total callback & video call request${total !== 1 ? 's' : ''}`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_CHIPS.map(chipItem => (
          <button
            key={chipItem.id}
            type="button"
            onClick={() => setFilter(chipItem.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === chipItem.id
                ? 'border-[rgb(var(--violet-rgb)/0.4)] bg-[rgb(var(--violet-rgb)/0.08)] text-[var(--violet)]'
                : 'border-border bg-white text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {chipItem.label}
          </button>
        ))}
      </div>

      <div className="executive-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Request ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Mobile</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Preferred Time</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Created At</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : callbacks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Phone className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No callback requests found
                  </td>
                </tr>
              ) : (
                callbacks.map(row => (
                  <tr key={row.request_id} className="hover:bg-[rgb(var(--violet-rgb)/0.04)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.request_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.username || '—'}</div>
                      <Link
                        to={`/users?phone=${row.phone_number}`}
                        className="cell-muted text-xs hover:underline"
                      >
                        {row.phone_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.mobile || '—'}</td>
                    <td className="px-4 py-3"><TypeBadge type={row.request_type} /></td>
                    <td className="px-4 py-3 cell-muted">
                      {row.request_type === 'video_call'
                        ? '—'
                        : (REASON_LABELS[row.reason] || row.reason || '—')}
                    </td>
                    <td className="px-4 py-3 cell-muted">
                      {TIME_LABELS[row.preferred_time] || row.preferred_time || '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 cell-muted whitespace-nowrap">
                      {safeFormatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'completed' ? (
                        <span className="text-xs text-muted-foreground">Done</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={updatingId === row.request_id}
                          onClick={() => handleMarkCompleted(row.request_id)}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > limit && (
          <div className="flex items-center justify-between border-t bg-white px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
