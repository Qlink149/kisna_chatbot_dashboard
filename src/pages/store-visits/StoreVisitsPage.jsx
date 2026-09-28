import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { listStoreVisits, updateStoreVisitStatus, exportStoreVisitsCsv } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { safeFormatDate } from '@/pages/users/utils'
import { ChevronLeft, ChevronRight, Download, MapPin } from 'lucide-react'

const STATUSES = ['new', 'contacted', 'visited', 'cancelled', 'no_show']

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  visited: 'Visited',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

const STATUS_COLOR_CLASSES = {
  new: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
  contacted: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  visited: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700',
  no_show: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
}

// Where the booking stands in the Clara -> Salesforce push.
const SYNC_LABELS = {
  sent: 'Synced',
  pending: 'Pending',
  failed: 'Failed',
  failed_permanent: 'Failed',
  not_queued: 'Not sent',
}

function formatVisitDate(iso) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }) {
  const value = status || 'new'
  const cls = STATUS_COLOR_CLASSES[value] || STATUS_COLOR_CLASSES.new
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {STATUS_LABELS[value] || value}
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

const FILTER_KEYS = ['status', 'state', 'city', 'date_from', 'date_to', 'q']

export default function StoreVisitsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 20

  const filters = {}
  for (const key of FILTER_KEYS) {
    const v = searchParams.get(key)
    if (v) filters[key] = v
  }
  const filterKey = FILTER_KEYS.map(k => filters[k] || '').join('|')

  const [search, setSearch] = useState(filters.q || '')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  const totalPages = Math.ceil(total / limit) || 1

  const fetchRows = useCallback(() => {
    setLoading(true)
    listStoreVisits(page, limit, filters)
      .then(res => {
        setRows(res?.data || [])
        setTotal(res?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filterKey])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const handleStatus = async (requestId, status) => {
    setUpdatingId(requestId)
    setError('')
    try {
      await updateStoreVisitStatus(requestId, status)
      fetchRows()
    } catch (e) {
      setError(e.message || 'Could not update the status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleExport = async () => {
    setError('')
    try {
      await exportStoreVisitsCsv(filters)
    } catch (e) {
      setError(e.message || 'Export failed')
    }
  }

  const inputCls = 'h-8 rounded-md border border-border bg-white px-2 text-xs'

  return (
    <div>
      <PageHeader
        title="Store Visits"
        description={`${total} store visit booking${total !== 1 ? 's' : ''}`}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {[{ id: '', label: 'All' }, ...STATUSES.map(s => ({ id: s, label: STATUS_LABELS[s] }))].map(chip => (
          <button
            key={chip.id || 'all'}
            type="button"
            onClick={() => setParam('status', chip.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              (filters.status || '') === chip.id
                ? 'border-[rgb(var(--violet-rgb)/0.4)] bg-[rgb(var(--violet-rgb)/0.08)] text-[var(--violet)]'
                : 'border-border bg-white text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <form
          onSubmit={e => { e.preventDefault(); setParam('q', search.trim()) }}
          className="flex gap-1"
        >
          <input
            className={`${inputCls} w-64`}
            placeholder="Search ID, name, phone, email, store"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" type="submit">Search</Button>
        </form>
        <input
          className={`${inputCls} w-32`}
          placeholder="State"
          defaultValue={filters.state || ''}
          onBlur={e => setParam('state', e.target.value.trim())}
        />
        <input
          className={`${inputCls} w-32`}
          placeholder="City"
          defaultValue={filters.city || ''}
          onBlur={e => setParam('city', e.target.value.trim())}
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Visit from
          <input type="date" className={inputCls} value={filters.date_from || ''} onChange={e => setParam('date_from', e.target.value)} />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          to
          <input type="date" className={inputCls} value={filters.date_to || ''} onChange={e => setParam('date_to', e.target.value)} />
        </label>
        <Button size="sm" variant="outline" className="ml-auto h-8 text-xs" onClick={handleExport}>
          <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="executive-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Request ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Looking For</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Store</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Visit</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Salesforce</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Booked At</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No store visits found
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.request_id} className="hover:bg-[rgb(var(--violet-rgb)/0.04)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.request_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}</div>
                      <div className="cell-muted text-xs">{row.mobile || '—'}</div>
                      {row.email ? <div className="cell-muted text-xs">{row.email}</div> : null}
                      <Link to={`/users?phone=${row.phone_number}`} className="cell-muted text-xs hover:underline">
                        WhatsApp {row.phone_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 cell-muted">{row.looking_for_label || row.looking_for || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.store?.name || '—'}</div>
                      <div className="cell-muted text-xs">
                        {[row.store?.city, row.store?.state].filter(Boolean).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 cell-muted whitespace-nowrap">
                      <div>{formatVisitDate(row.preferred_date)}</div>
                      <div className="text-xs">{row.preferred_time_label || row.preferred_time || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                      {row.status_updated_by ? (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          by {row.status_updated_by} · {safeFormatDate(row.status_updated_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 cell-muted text-xs">{SYNC_LABELS[row.sf_sync_status] || row.sf_sync_status || '—'}</td>
                    <td className="px-4 py-3 cell-muted whitespace-nowrap">{safeFormatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        className={inputCls}
                        value={row.status || 'new'}
                        disabled={updatingId === row.request_id}
                        onChange={e => handleStatus(row.request_id, e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
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
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
