import { useEffect, useMemo, useState } from 'react'
import { Copy, Download, FileText, Info, Loader2, Sparkles, User, MessageSquare, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { getMessageTrace } from '@/lib/api'

function formatMsgTime(ts) {
  if (!ts) return null
  return new Date(ts * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function istDayKey(ts) {
  if (!ts) return null
  return new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function formatDateChip(ts) {
  if (!ts) return null
  const day = istDayKey(ts)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (day === today) return 'Today'
  if (day === yesterday) return 'Yesterday'
  return new Date(ts * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

const URL_RE = /(https?:\/\/[^\s]+)/g

function renderBracketHighlight(text, keyPrefix) {
  const parts = text.split(/(\[.*?\])/g)
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return <span key={`${keyPrefix}-b-${i}`} className="font-semibold text-primary">{part}</span>
    }
    return part ? <span key={`${keyPrefix}-t-${i}`}>{part}</span> : null
  })
}

function renderMessageContent(content) {
  if (!content) return null
  const segments = content.split(URL_RE)
  return segments.map((segment, i) => {
    if (segment.startsWith('http://') || segment.startsWith('https://')) {
      return (
        <a
          key={`url-${i}`}
          href={segment}
          target="_blank"
          rel="noreferrer"
          className="break-all underline text-primary hover:opacity-80"
        >
          {segment}
        </a>
      )
    }
    return renderBracketHighlight(segment, `seg-${i}`)
  })
}

const OUTCOME_META = {
  products_sent: { label: 'Products sent', tone: 'ok' },
  info_sent: { label: 'Info sent', tone: 'ok' },
  menu_sent: { label: 'Menu sent', tone: 'ok' },
  fallback_used: { label: 'Closest matches shown', tone: 'warn' },
  no_products: { label: 'No products found', tone: 'warn' },
  handoff: { label: 'Handed to live agent', tone: 'warn' },
  error: { label: 'Error', tone: 'error' },
}

const OUTCOME_BANNER = {
  no_products: "Kisna's catalogue API returned no products for this search.",
  fallback_used: 'Exact filters returned nothing — showed closest matches instead.',
  handoff: 'The bot stopped answering and handed this conversation to a live agent.',
  error: 'This turn failed. The customer got the generic error reply.',
}

const TONE_CLASSES = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  warn: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
}

const DOT_CLASSES = { ok: 'bg-emerald-500', warn: 'bg-amber-400', error: 'bg-red-500' }

function toneOf(status) {
  return status === 'error' ? 'error' : status === 'warn' ? 'warn' : 'ok'
}

function StatusDot({ status }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', DOT_CLASSES[toneOf(status)])} />
}

function Pill({ tone = 'ok', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

function formatMs(ms) {
  if (ms == null || Number.isNaN(ms)) return null
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`
}

function Field({ label, value, tone }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-xs font-medium break-words', tone === 'error' && 'text-red-600 dark:text-red-400')}>
        {String(value)}
      </p>
    </div>
  )
}

function JsonBlock({ value, className }) {
  return (
    <pre
      className={cn(
        'mt-1 max-h-72 overflow-auto rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-zinc-100',
        className
      )}
    >
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Collapsible({ title, defaultOpen = false, children, right }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {right}
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="border-t border-border px-3 py-2">{children}</div>}
    </div>
  )
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation()
        try {
          navigator.clipboard?.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard unavailable (insecure context) — nothing useful to do
        }
      }}
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copied' : label}
    </button>
  )
}

function TraceStep({ step }) {
  const [open, setOpen] = useState(false)
  const hasPayload = step.payload && Object.keys(step.payload).length > 0
  const tone = toneOf(step.status)
  return (
    <li className="flex gap-2.5">
      <div className="flex flex-col items-center pt-1.5">
        <StatusDot status={step.status} />
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground">{step.order}.</span>
          <p className="text-xs font-semibold text-foreground">{step.label}</p>
          {tone !== 'ok' && <Pill tone={tone}>{step.status}</Pill>}
          {step.t_ms != null && (
            <span className="text-[10px] tabular-nums text-muted-foreground">+{formatMs(step.t_ms)}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
          {step.detail}
        </p>
        {hasPayload && (
          <>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
              {open ? 'Hide data' : 'Show data'}
            </button>
            {open && <JsonBlock value={step.payload} />}
          </>
        )}
      </div>
    </li>
  )
}

const LOG_LEVEL_CLASSES = {
  ERROR: 'text-red-500',
  CRITICAL: 'text-red-500',
  WARNING: 'text-amber-500',
  INFO: 'text-sky-500',
  DEBUG: 'text-zinc-500',
}

function levelBucket(level) {
  if (level === 'ERROR' || level === 'CRITICAL') return 'error'
  if (level === 'WARNING') return 'warn'
  return 'info'
}

function Waterfall({ steps, totalMs }) {
  const timed = (steps || []).filter(s => s.t_ms != null)
  if (timed.length < 2 || !totalMs) return null

  return (
    <div className="mb-3 space-y-1 rounded-lg border border-border p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Timing · {formatMs(totalMs)} total
      </p>
      {timed.map((step, i) => {
        const start = step.t_ms
        const end = i + 1 < timed.length ? timed[i + 1].t_ms : totalMs
        const dur = Math.max(end - start, 0)
        const left = Math.min((start / totalMs) * 100, 100)
        const width = Math.max(Math.min((dur / totalMs) * 100, 100 - left), 0.8)
        return (
          <div key={`${step.order}-bar`} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-[10px] text-muted-foreground" title={step.label}>
              {step.label}
            </span>
            <div className="relative h-2.5 flex-1 rounded-full bg-muted">
              <div
                className={cn('absolute h-2.5 rounded-full', DOT_CLASSES[toneOf(step.status)])}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
              {formatMs(dur)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LogRow({ entry }) {
  const [open, setOpen] = useState(false)
  const bucket = levelBucket(entry.level)
  const hasDetail = (entry.extra && Object.keys(entry.extra).length > 0) || entry.exception

  return (
    <div
      className={cn(
        'border-l-2 px-2 py-1 font-mono text-[10px] leading-relaxed hover:bg-muted/50',
        bucket === 'error'
          ? 'border-l-red-500 bg-red-50/40 dark:bg-red-950/20'
          : bucket === 'warn'
          ? 'border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
          : 'border-l-transparent'
      )}
    >
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen(v => !v)}
        className={cn('flex w-full items-start gap-2 text-left', hasDetail && 'cursor-pointer')}
      >
        <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
          {entry.t_ms != null ? `+${entry.t_ms}` : '—'}
        </span>
        <span className={cn('w-14 shrink-0 font-semibold', LOG_LEVEL_CLASSES[entry.level])}>
          {entry.level}
        </span>
        <span className="w-40 shrink-0 truncate text-muted-foreground" title={`${entry.module}:${entry.line}`}>
          {entry.module}:{entry.line}
        </span>
        <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{entry.message}</span>
        {hasDetail && (
          <ChevronDown className={cn('mt-0.5 h-3 w-3 shrink-0 text-muted-foreground', open && 'rotate-180')} />
        )}
      </button>
      {open && (
        <div className="pl-12">
          {entry.extra && Object.keys(entry.extra).length > 0 && <JsonBlock value={entry.extra} />}
          {entry.exception && <JsonBlock value={entry.exception} />}
        </div>
      )}
    </div>
  )
}

function LogsView({ logs }) {
  const [level, setLevel] = useState('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const c = { all: logs.length, error: 0, warn: 0, info: 0 }
    for (const l of logs) c[levelBucket(l.level)] += 1
    return c
  }, [logs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter((l) => {
      if (level !== 'all' && levelBucket(l.level) !== level) return false
      if (!q) return true
      const hay = `${l.message} ${l.module} ${l.func} ${JSON.stringify(l.extra || {})}`.toLowerCase()
      return hay.includes(q)
    })
  }, [logs, level, query])

  if (!logs.length) {
    return (
      <p className="py-4 text-xs text-muted-foreground">
        No logs captured for this turn. Successful turns keep only warnings, errors, and timed calls.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {['all', 'error', 'warn', 'info'].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLevel(id)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize transition-colors',
              level === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-muted-foreground hover:text-foreground'
            )}
          >
            {id} {counts[id]}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter logs…"
          className="ml-auto h-6 w-32 rounded-md border border-input bg-background px-2 text-[10px] outline-none focus:ring-1 focus:ring-ring"
        />
        <CopyButton value={JSON.stringify(logs, null, 2)} label="Copy" />
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-[10px] text-muted-foreground">No logs match that filter.</p>
        ) : (
          filtered.map((entry, i) => <LogRow key={`${entry.t_ms}-${entry.line}-${i}`} entry={entry} />)
        )}
      </div>
    </div>
  )
}

const TABS = ['Summary', 'Timeline', 'Logs', 'Raw']

function TraceBody({ trace }) {
  const [tab, setTab] = useState('Summary')
  const meta = OUTCOME_META[trace?.outcome] || { label: trace?.outcome || 'Unknown', tone: 'ok' }
  const banner = OUTCOME_BANNER[trace?.outcome]
  const confidence = trace?.confidence
  const lowConfidence = typeof confidence === 'number' && confidence < 0.55
  const logs = trace?.logs || []
  const errorCount = logs.filter(l => levelBucket(l.level) === 'error').length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={meta.tone}>{meta.label}</Pill>
        {trace?.latency_ms != null && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatMs(trace.latency_ms)} total
          </span>
        )}
        {trace?.ts && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(trace.ts * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </span>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'relative px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
            {t === 'Logs' && logs.length > 0 && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1 text-[9px] tabular-nums',
                  errorCount > 0 ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {errorCount > 0 ? errorCount : logs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Summary' && (
        <div className="space-y-3">
          {banner && (
            <div className={cn('rounded-md border px-2.5 py-2 text-[11px]', TONE_CLASSES[meta.tone])}>
              {banner}
            </div>
          )}

          {trace?.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                Exception
              </p>
              <p className="mt-1 text-xs font-semibold text-red-800 dark:text-red-200 break-words">
                {trace.error.type}: {trace.error.message}
              </p>
              {trace.error.traceback && <JsonBlock value={trace.error.traceback} />}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
            <Field label="Intent" value={trace?.intent} />
            <Field
              label="Confidence"
              value={typeof confidence === 'number' ? confidence.toFixed(2) : confidence}
              tone={lowConfidence ? 'error' : undefined}
            />
            <Field label="Service" value={trace?.service_selected} />
            <Field label="Language" value={trace?.language} />
            <Field label="Inbound type" value={trace?.message_type} />
            <Field label="Reply parts" value={(trace?.bot_response_types || []).join(', ')} />
          </div>
          {lowConfidence && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              Confidence below 0.55 — this turn was likely routed to the wrong intent.
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer said</p>
              <p className="text-xs break-words">{trace?.user_message || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bot replied</p>
              <p className="text-xs text-muted-foreground break-words">{trace?.reply_preview || '—'}</p>
            </div>
          </div>

          {trace?.session_state && Object.keys(trace.session_state).length > 0 && (
            <Collapsible title="Session state">
              <JsonBlock value={trace.session_state} />
            </Collapsible>
          )}
        </div>
      )}

      {tab === 'Timeline' && (
        <div>
          <Waterfall steps={trace?.steps} totalMs={trace?.latency_ms} />
          <ol className="space-y-0">
            {(trace?.steps || []).map((step) => (
              <TraceStep key={`${step.order}-${step.label}`} step={step} />
            ))}
          </ol>
        </div>
      )}

      {tab === 'Logs' && <LogsView logs={logs} />}

      {tab === 'Raw' && (
        <div className="space-y-2">
          <CopyButton value={JSON.stringify(trace, null, 2)} label="Copy JSON" />
          <JsonBlock value={trace} className="max-h-[60vh]" />
        </div>
      )}
    </div>
  )
}

// Keyed by requestId at the mount site, so opening a different message remounts
// this with fresh state instead of resetting it inside an effect.
function TraceLoader({ requestId }) {
  const [state, setState] = useState({ status: 'loading', trace: null, error: null })

  useEffect(() => {
    let cancelled = false
    getMessageTrace(requestId)
      .then((doc) => {
        if (!cancelled) setState({ status: 'done', trace: doc, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: 'failed', trace: null, error: err?.message || 'Could not load details' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [requestId])

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
      </div>
    )
  }
  if (state.status === 'failed') {
    return <p className="text-xs text-red-600">{state.error}</p>
  }
  if (!state.trace) {
    return (
      <p className="text-xs text-muted-foreground">
        No trace stored for this message. Traces are kept for 30 days.
      </p>
    )
  }
  return <TraceBody trace={state.trace} />
}

function TracePanel({ requestId, onClose }) {
  return (
    <Sheet open={!!requestId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
          <SheetTitle className="text-sm font-semibold">What happened</SheetTitle>
          <div className="mt-1 flex items-center gap-2">
            <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {requestId}
            </code>
            <CopyButton value={requestId} label="ID" />
          </div>
        </div>
        <div className="px-4 py-3">
          {requestId && <TraceLoader key={requestId} requestId={requestId} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MediaCaption({ text }) {
  if (!text) return null
  return (
    <div className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed [overflow-wrap:anywhere]">
      {renderMessageContent(text)}
    </div>
  )
}

function ImageLightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="presentation"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-black/40 p-1.5 text-white/90 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Attachment"
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// Renders an inbound or outbound media attachment -- image (thumbnail +
// lightbox), audio/video (native player), or document (download chip). A
// signed URL that has expired (past the B2 retention window, or the presign
// TTL lapsed before the viewer opened it) degrades to a placeholder instead
// of a broken-media icon.
function MediaBlock({ media }) {
  const [expired, setExpired] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!media) return null

  if (!media.url || expired) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Media unavailable
      </div>
    )
  }

  if (media.kind === 'image') {
    return (
      <div className="min-w-0">
        <img
          src={media.url}
          alt={media.caption || 'Image'}
          className="max-h-64 max-w-full rounded-lg object-cover cursor-pointer"
          onClick={() => setLightboxOpen(true)}
          onError={() => setExpired(true)}
        />
        <MediaCaption text={media.caption} />
        {lightboxOpen && <ImageLightbox src={media.url} onClose={() => setLightboxOpen(false)} />}
      </div>
    )
  }

  if (media.kind === 'audio') {
    return <audio controls className="max-w-full" src={media.url} onError={() => setExpired(true)} />
  }

  if (media.kind === 'video') {
    return (
      <div className="min-w-0">
        <video controls className="max-h-64 max-w-full rounded-lg" src={media.url} onError={() => setExpired(true)} />
        <MediaCaption text={media.caption} />
      </div>
    )
  }

  // document
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      download
      className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 hover:bg-background transition-colors"
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{media.filename || 'Document'}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  )
}

function MessageBubble({ msg, outcomeHint, onOpenTrace }) {
  const isBot = msg.role === 'assistant'
  const showDetails = isBot && !!msg.request_id
  const problemDot =
    outcomeHint === 'error'
      ? 'bg-red-500'
      : outcomeHint === 'no_products' || outcomeHint === 'fallback_used'
      ? 'bg-amber-400'
      : null

  return (
    <div className={cn('flex w-full min-w-0', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
      {msg.role === 'assistant' && (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border relative"
          style={{
            background: 'linear-gradient(to bottom right, rgb(var(--violet-rgb) / 0.15), rgb(var(--royal-rgb) / 0.08))',
            borderColor: 'rgb(var(--violet-rgb) / 0.12)',
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />
          {problemDot && (
            <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white', problemDot)} />
          )}
        </div>
      )}

      {msg.role === 'agent' && (
        <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-amber-500/20">
          <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
      )}

      <div
        className={cn(
          'relative w-fit max-w-[75%] min-w-0 shrink px-3.5 py-2.5 rounded-2xl shadow-sm text-sm group',
          msg.role === 'user'
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
            : msg.role === 'agent'
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 rounded-tl-none border border-amber-200 dark:border-amber-800'
            : 'bg-white text-[var(--text)] rounded-tl-none border border-[rgb(var(--navy-rgb)/0.1)] shadow-sm'
        )}
      >
        {msg.role === 'agent' && (
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wider">
            Live Agent
          </p>
        )}
        {msg.media ? (
          <MediaBlock media={msg.media} />
        ) : (
          <div className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">
            {renderMessageContent(msg.content)}
          </div>
        )}
        <div className="mt-1 flex items-center justify-end gap-2">
          {showDetails && (
            <button
              type="button"
              onClick={() => onOpenTrace(msg.request_id)}
              className="opacity-70 hover:opacity-100 text-[9px] inline-flex items-center gap-0.5 text-muted-foreground"
            >
              <Info className="h-3 w-3" />
              Details
            </button>
          )}
          <p className="text-[9px] text-right opacity-80 select-none">
            {formatMsgTime(msg.timestamp) ?? '—'}
          </p>
        </div>
      </div>

      {msg.role === 'user' && (
        <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 ml-2 mt-1 border border-border">
          <User className="h-4 w-4 text-zinc-500" />
        </div>
      )}
    </div>
  )
}

export default function ChatMessages({
  activePhone,
  loadingActive,
  chatHistory,
  scrollRef,
  showScrollBottom,
  onScroll,
  onScrollToBottom,
  loadingOlder = false,
  hasMore = false,
  beginningReached = false,
}) {
  // One trace open at a time, owned here so the drawer is not clipped by the
  // message bubble's max-width.
  const [traceRequestId, setTraceRequestId] = useState(null)

  const items = useMemo(() => {
    const out = []
    let lastDay = null
    for (let i = 0; i < (chatHistory || []).length; i++) {
      const msg = chatHistory[i]
      const day = istDayKey(msg?.timestamp)
      if (day && day !== lastDay) {
        out.push({ kind: 'date', key: `date-${day}-${i}`, label: formatDateChip(msg.timestamp) })
        lastDay = day
      } else if (!day) {
        // legacy without timestamp — no chip
      }
      out.push({ kind: 'msg', key: msg._id || `msg-${i}-${msg.timestamp || i}`, msg })
    }
    return out
  }, [chatHistory])

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 min-h-0 basis-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 space-y-4 relative"
    >
      {!activePhone ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
            <MessageSquare className="h-10 w-10 text-primary/40" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2">KISNA AI</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select a user from the sidebar to view their complete interaction history and AI responses.
          </p>
        </div>
      ) : loadingActive ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading history...</p>
          </div>
        </div>
      ) : chatHistory.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-muted-foreground bg-card/50 px-4 py-2 rounded-full border shadow-sm">
            Conversation history is empty.
          </p>
        </div>
      ) : (
        <div className="relative pb-10 space-y-4 min-w-0">
          {loadingOlder && (
            <div className="flex justify-center py-1">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {beginningReached && !hasMore && (
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                Beginning of conversation
              </span>
            </div>
          )}
          {items.map((item) =>
            item.kind === 'date' ? (
              <div key={item.key} className="flex justify-center sticky top-1 z-10">
                <span className="rounded-full bg-card/90 border px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
                  {item.label}
                </span>
              </div>
            ) : (
              <MessageBubble
                key={item.key}
                msg={item.msg}
                outcomeHint={item.msg.trace_outcome}
                onOpenTrace={setTraceRequestId}
              />
            )
          )}
        </div>
      )}

      <TracePanel requestId={traceRequestId} onClose={() => setTraceRequestId(null)} />

      {showScrollBottom && activePhone && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg h-10 w-10 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto border bg-card/95 hover:bg-card"
            onClick={onScrollToBottom}
            title="Scroll to latest messages"
          >
            <ChevronDown className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      )}
    </div>
  )
}
