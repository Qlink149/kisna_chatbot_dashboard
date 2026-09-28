import { useState, useEffect, useCallback, useRef } from 'react'
import { listStores, updateStoreFlags, importStoresCsv, exportStoresCsv } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Download, Store, Upload } from 'lucide-react'

const CSV_COLUMNS =
  'store_id, name, address, city, state, pincode, phone, open_time, close_time, weekly_off, bookable, active'

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

export default function StoresPage() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('')
  const [upload, setUpload] = useState(null) // {ok, rows, inserted, updated, errors}
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const fetchStores = useCallback(() => {
    setLoading(true)
    listStores()
      .then(res => setStores(res?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const handleToggle = async (storeId, flags) => {
    setBusyId(storeId)
    setError('')
    try {
      const updated = await updateStoreFlags(storeId, flags)
      setStores(prev => prev.map(s => (s.store_id === storeId ? { ...s, ...updated } : s)))
    } catch (e) {
      setError(e.message || 'Could not update the store')
    } finally {
      setBusyId(null)
    }
  }

  const handleUpload = async (file) => {
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <p className="mb-3 text-xs text-muted-foreground">
        CSV columns: {CSV_COLUMNS}. Rows are matched on store_id. If any row has an error the whole file is rejected and nothing changes.
      </p>

      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {upload && (upload.ok ? (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Imported {upload.rows} rows · {upload.inserted} new · {upload.updated} updated.
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
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Active</th>
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
                  <tr key={s.store_id} className="hover:bg-[rgb(var(--violet-rgb)/0.04)]">
                    <td className="px-4 py-3 font-mono text-xs">{s.store_id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="cell-muted text-xs">{[s.address, s.pincode].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-3 cell-muted">{s.city}, {s.state}</td>
                    <td className="px-4 py-3 cell-muted whitespace-nowrap">{s.open_time}–{s.close_time}</td>
                    <td className="px-4 py-3 cell-muted capitalize">{(s.weekly_off || []).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <Toggle
                        label={`Bookable: ${s.name}`}
                        checked={!!s.bookable}
                        disabled={busyId === s.store_id}
                        onChange={v => handleToggle(s.store_id, { bookable: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle
                        label={`Active: ${s.name}`}
                        checked={!!s.active}
                        disabled={busyId === s.store_id}
                        onChange={v => handleToggle(s.store_id, { active: v })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
