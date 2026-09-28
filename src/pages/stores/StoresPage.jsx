import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import {
  listStores,
  updateStoreOverrides,
  importStoresCsv,
  exportStoresCsv,
  runStoreSync,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { safeFormatDate } from '@/pages/users/utils'
import { Download, RefreshCw, Store, Upload } from 'lucide-react'

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ADMIN_ROLES = ['super_admin', 'admin']

// Owned by the kisna.com sync -- read-only here.
const SYNCED = [
  ['name', 'Name'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
  ['pincode', 'PIN'],
  ['phone', 'Phone'],
]

const CSV_HELP =
  'CSV: store_id plus any of bookable, open_time (HH:MM), close_time, weekly_off (e.g. tuesday;sunday). ' +
  'A downloaded CSV can be edited and uploaded back. Name, address, city, state, PIN, phone and active come from kisna.com; ' +
  'changing them is rejected. If any row has an error the whole file is rejected and nothing changes.'

const SYNC_STATUS_CLASSES = {
  ok: 'border-green-200 bg-green-50 text-green-700',
  aborted: 'border-amber-200 bg-amber-50 text-amber-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
}

function Toggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-[var(--violet)]' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SyncPanel({ run, isAdmin, syncing, onSync }) {
  const counts = run?.counts || {}
  const changes = run?.changes || {}
  const changeLine = ['added', 'updated', 'deactivated', 'reactivated']
    .filter(k => (changes[k] || []).length)
    .map(k => `${k}: ${changes[k].join(', ')}`)
  return (
    <div className="executive-card mb-4 flex flex-wrap items-start gap-3 p-3 text-xs">
      <div className="flex-1 min-w-[260px]">
        <div className="mb-1 font-medium">kisna.com store sync · daily 02:00 IST</div>
        {run ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 font-medium capitalize ${SYNC_STATUS_CLASSES[run.status] || ''}`}>
                {run.status}
              </span>
              <span className="text-muted-foreground">
                {safeFormatDate(run.started_at)} · {run.trigger}
              </span>
              {run.status === 'ok' && (
                <span className="text-muted-foreground">
                  {counts.added || 0} added · {counts.updated || 0} updated · {counts.deactivated || 0} deactivated · {counts.reactivated || 0} reactivated
                </span>
              )}
            </div>
            {run.reason && <div className="mt-1 text-amber-800">{run.reason} — nothing was changed.</div>}
            {changeLine.length > 0 && (
              <div className="mt-1 text-muted-foreground break-words">{changeLine.join(' · ')}</div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground">No sync has run yet.</div>
        )}
      </div>
      {isAdmin && (
        <Button size="sm" variant="outline" className="h-8 text-xs" disabled={syncing} onClick={onSync}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      )}
    </div>
  )
}

function EditRow({ store, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    bookable: !!store.bookable,
    open_time: store.open_time || '',
    close_time: store.close_time || '',
    weekly_off: store.weekly_off || [],
  })
  const toggleDay = day =>
    setForm(f => ({
      ...f,
      weekly_off: f.weekly_off.includes(day) ? f.weekly_off.filter(d => d !== day) : [...f.weekly_off, day],
    }))
  const inputCls = 'h-8 rounded-md border border-border bg-white px-2 text-xs'

  return (
    <tr className="bg-[rgb(var(--mist-rgb)/0.4)]">
      <td colSpan={7} className="px-4 py-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium">From kisna.com (read-only)</div>
            <dl className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-xs">
              {SYNCED.map(([key, label]) => (
                <Fragment key={key}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    <input className={`${inputCls} w-full cursor-not-allowed bg-zinc-50 text-muted-foreground`} value={store[key] || '—'} readOnly disabled />
                  </dd>
                </Fragment>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
              These come from the kisna.com store list and are refreshed every night. Change them on the website, not here.
            </p>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium">Store visit settings (editable)</div>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2">
                <Toggle
                  label="Bookable"
                  checked={form.bookable}
                  onChange={v => setForm(f => ({ ...f, bookable: v }))}
                />
                Bookable for store visits
              </label>
              <div className="flex items-center gap-2">
                Opens
                <input type="time" className={inputCls} value={form.open_time} onChange={e => setForm(f => ({ ...f, open_time: e.target.value }))} />
                Closes
                <input type="time" className={inputCls} value={form.close_time} onChange={e => setForm(f => ({ ...f, close_time: e.target.value }))} />
              </div>
              <div>
                <div className="mb-1">Weekly off</div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <label key={day} className="flex items-center gap-1 capitalize">
                      <input type="checkbox" checked={form.weekly_off.includes(day)} onChange={() => toggleDay(day)} />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" disabled={saving} onClick={() => onSave(form)}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function StoresPage() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role || 'super_admin')
  const [stores, setStores] = useState([])
  const [lastSync, setLastSync] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('')
  const [upload, setUpload] = useState(null) // {ok, rows, updated, errors}
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const fetchStores = useCallback(() => {
    setLoading(true)
    listStores()
      .then(res => {
        setStores(res?.data || [])
        setLastSync(res?.last_sync || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const saveOverrides = async (storeId, overrides) => {
    setBusyId(storeId)
    setError('')
    try {
      const updated = await updateStoreOverrides(storeId, overrides)
      setStores(prev => prev.map(s => (s.store_id === storeId ? { ...s, ...updated } : s)))
      setEditing(null)
    } catch (e) {
      setError(e.message || 'Could not update the store')
    } finally {
      setBusyId(null)
    }
  }

  const handleUpload = async file => {
    if (!file) return
    setUploading(true)
    setUpload(null)
    setError('')
    try {
      const res = await importStoresCsv(file)
      setUpload(res)
      if (res?.ok) fetchStores()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    try {
      const run = await runStoreSync()
      setLastSync(run)
      fetchStores()
    } catch (e) {
      setError(e.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const needle = filter.trim().toLowerCase()
  const shown = needle
    ? stores.filter(s =>
        [s.store_id, s.name, s.city, s.state, s.pincode].some(v => String(v || '').toLowerCase().includes(needle)))
    : stores
  const bookable = stores.filter(s => s.active && s.bookable).length

  return (
    <div>
      <PageHeader
        title="Stores"
        description={`${stores.length} stores · ${bookable} bookable for store visits`}
      />

      <SyncPanel run={lastSync} isAdmin={isAdmin} syncing={syncing} onSync={handleSync} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="h-8 w-64 rounded-md border border-border bg-white px-2 text-xs"
          placeholder="Filter by ID, name, city, state, PIN"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => handleUpload(e.target.files?.[0])}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload CSV'}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => exportStoresCsv().catch(e => setError(e.message))}>
            <Download className="mr-1 h-3.5 w-3.5" /> Download CSV
          </Button>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{CSV_HELP}</p>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {upload && (upload.ok ? (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Checked {upload.rows} rows · {upload.updated} stores changed.
        </div>
      ) : (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="mb-1 font-medium">File rejected — nothing was changed. Fix these rows and upload again:</div>
          <ul className="list-disc pl-5">
            {(upload.errors || []).map((e, i) => (
              <li key={i}>{e.row ? `Line ${e.row}: ` : ''}{e.error}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="executive-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgb(var(--mist-rgb)/0.6)]">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Store ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Store</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">City / State</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Hours</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Weekly Off</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Bookable</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">On kisna.com</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Store className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No stores found
                  </td>
                </tr>
              ) : (
                shown.map(s => (
                  <Fragment key={s.store_id}>
                    <tr
                      className="cursor-pointer hover:bg-[rgb(var(--violet-rgb)/0.04)]"
                      onClick={() => setEditing(editing === s.store_id ? null : s.store_id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{s.store_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.name}</div>
                        <div className="cell-muted text-xs">{[s.address, s.pincode].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-4 py-3 cell-muted">{s.city}, {s.state}</td>
                      <td className="px-4 py-3 cell-muted whitespace-nowrap">{s.open_time}–{s.close_time}</td>
                      <td className="px-4 py-3 cell-muted capitalize">{(s.weekly_off || []).join(', ') || '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Toggle
                          label={`Bookable: ${s.name}`}
                          checked={!!s.bookable}
                          disabled={busyId === s.store_id}
                          onChange={v => saveOverrides(s.store_id, { bookable: v })}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.active
                          ? <span className="text-green-700">Listed</span>
                          : <span className="text-muted-foreground">Removed from site</span>}
                      </td>
                    </tr>
                    {editing === s.store_id && (
                      <EditRow
                        store={s}
                        saving={busyId === s.store_id}
                        onCancel={() => setEditing(null)}
                        onSave={form => saveOverrides(s.store_id, form)}
                      />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
