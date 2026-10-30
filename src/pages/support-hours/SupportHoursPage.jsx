import { createElement, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarOff, Clock, MessageSquareText, PhoneOff, Plus, Trash2, Umbrella } from 'lucide-react'
import { getSupportSchedule, saveSupportSchedule } from '@/lib/api'
import {
  MAX_AWAY_MESSAGE,
  MAX_NAME,
  emptyBlackout,
  emptyClosure,
  emptyHoliday,
  isDirty,
  isPast,
  prettyWhen,
  toForm,
  toPayload,
  validate,
} from '@/lib/supportSchedule'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { safeFormatDate } from '@/pages/users/utils'

const QUERY_KEY = ['support-schedule']
const inputCls =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring'

// "Now" in India as a sortable string, to dim entries that are already over.
const nowIst = () =>
  new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T').slice(0, 16)

function Section({ icon, title, hint, children, action }) {
  return (
    <section className="executive-card mb-4 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {createElement(icon, { className: 'h-4 w-4 text-muted-foreground', 'aria-hidden': true })} {title}
          </h2>
          {hint && <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}

function Counter({ value, max }) {
  const over = value > max
  return (
    <span className={`text-[11px] tabular-nums ${over ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
      {value.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
    </span>
  )
}

function RemoveButton({ label, onClick }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700"
      title="Remove"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}

function AddButton({ children, onClick }) {
  return (
    <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onClick}>
      <Plus className="mr-1 h-3.5 w-3.5" /> {children}
    </Button>
  )
}

function Empty({ children }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">{children}</p>
}

export default function SupportHoursPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: QUERY_KEY, queryFn: getSupportSchedule })

  const saved = useMemo(() => (data ? toForm(data) : null), [data])
  // The user's unsaved edits, or null while there are none. The form shows the
  // edits when there are some and the saved values otherwise, so a background
  // refetch can never wipe what they are typing.
  const [edits, setEdits] = useState(null)
  const form = edits ?? saved
  const setForm = next => setEdits(prev => (typeof next === 'function' ? next(prev ?? saved) : next))
  const [serverError, setServerError] = useState('')

  const save = useMutation({
    mutationFn: body => saveSupportSchedule(body),
    onSuccess: res => {
      toast.success('Saved — the bot uses the new hours within a few seconds')
      setServerError('')
      queryClient.setQueryData(QUERY_KEY, res)
      setEdits(null)
    },
    onError: e => setServerError(e.message),
  })

  if (isError) {
    return (
      <div>
        <PageHeader title="Support hours" />
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError?.message || 'Couldn’t load the support hours'}
        </div>
      </div>
    )
  }

  if (isLoading || !form) {
    return (
      <div>
        <PageHeader title="Support hours" description="When the team is available, holidays and closures." />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="executive-card mb-4 p-4"><Skeleton className="h-20 w-full" /></div>
        ))}
      </div>
    )
  }

  const problems = validate(form)
  const dirty = isDirty(form, saved)
  const now = nowIst()
  const status = data?.current_status

  const setWeekly = (key, value) => setForm(f => ({ ...f, weekly: { ...f.weekly, [key]: value } }))
  const setRow = (list, index, patch) =>
    setForm(f => ({ ...f, [list]: f[list].map((row, i) => (i === index ? { ...row, ...patch } : row)) }))
  const addRow = (list, make) => setForm(f => ({ ...f, [list]: [...f[list], make()] }))
  const removeRow = (list, index) => setForm(f => ({ ...f, [list]: f[list].filter((_, i) => i !== index) }))

  // Holidays are easier to scan in date order; keep the row's original index
  // so edits still hit the right entry.
  const holidayRows = form.holidays
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.date || '9999').localeCompare(b.row.date || '9999'))

  const awayLen = form.away_message.trim().length

  return (
    <div>
      <PageHeader
        title="Support hours"
        description="Set when the team is available. Changes reach the bot within a few seconds. All times are India time (IST)."
      />

      {status && (
        <div
          className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs ${
            status.status === 'open'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <span className="font-semibold">Right now: {status.label}</span>
          <span className="text-muted-foreground">
            {data.source === 'custom'
              ? `Last changed by ${data.updated_by || 'someone'}${data.updated_at ? ` · ${safeFormatDate(data.updated_at)}` : ''}`
              : 'Using the standard hours — nothing saved yet'}
          </span>
        </div>
      )}

      <Section
        icon={MessageSquareText}
        title="Away message"
        hint="Sent to a customer who asks for a person while the team is offline, followed by the callback form. Leave it empty to use the standard wording. Customers writing in another language get it translated."
      >
        <div className="mb-1 flex justify-end">
          <Counter value={awayLen} max={MAX_AWAY_MESSAGE} />
        </div>
        <textarea
          className={`${inputCls} min-h-24 resize-y leading-5`}
          value={form.away_message}
          onChange={e => setForm(f => ({ ...f, away_message: e.target.value }))}
          placeholder="Thank you for connecting with KISNA! Our jewellery experts are currently unavailable…"
          aria-label="Away message"
        />
      </Section>

      <Section
        icon={Clock}
        title="Working hours"
        hint="Sundays are always closed. Holidays and closures below override these hours."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Monday – Friday</div>
            <div className="flex items-end gap-3">
              <Field label="Opens" className="flex-1">
                <input type="time" className={inputCls} value={form.weekly.weekday_open}
                  onChange={e => setWeekly('weekday_open', e.target.value)} />
              </Field>
              <Field label="Closes" className="flex-1">
                <input type="time" className={inputCls} value={form.weekly.weekday_close}
                  onChange={e => setWeekly('weekday_close', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Saturday</div>
            <div className="flex items-end gap-3">
              <Field label="Opens" className="flex-1">
                <input type="time" className={inputCls} value={form.weekly.saturday_open}
                  onChange={e => setWeekly('saturday_open', e.target.value)} />
              </Field>
              <Field label="Closes" className="flex-1">
                <input type="time" className={inputCls} value={form.weekly.saturday_close}
                  onChange={e => setWeekly('saturday_close', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </Section>

      <Section
        icon={Umbrella}
        title="Closures"
        hint="Times when the team is offline even on a normal working day — an early finish, an office event, a festival break. The bot sends the away message and the callback form until the “until” time."
        action={<AddButton onClick={() => addRow('closures', emptyClosure)}>Add closure</AddButton>}
      >
        {form.closures.length === 0 ? (
          <Empty>No closures</Empty>
        ) : (
          <div className="space-y-3">
            {form.closures.map((c, i) => (
              <div
                key={i}
                data-testid="closure-row"
                className={`flex flex-wrap items-end gap-3 rounded-md border border-border/60 p-3 ${isPast(c.end, now) ? 'opacity-60' : ''}`}
              >
                <Field label="Reason" className="min-w-40 flex-1">
                  <input className={inputCls} value={c.name} maxLength={MAX_NAME}
                    onChange={e => setRow('closures', i, { name: e.target.value })} placeholder="e.g. Office function" />
                </Field>
                <Field label="From">
                  <input type="datetime-local" className={inputCls} value={c.start}
                    onChange={e => setRow('closures', i, { start: e.target.value })} />
                </Field>
                <Field label="Until (reopens)">
                  <input type="datetime-local" className={inputCls} value={c.end}
                    onChange={e => setRow('closures', i, { end: e.target.value })} />
                </Field>
                <RemoveButton label={`Remove closure ${i + 1}`} onClick={() => removeRow('closures', i)} />
                {c.start && c.end && c.end > c.start && (
                  <p className="basis-full text-[11px] text-muted-foreground">
                    Offline {prettyWhen(c.start)} → {prettyWhen(c.end)}
                    {isPast(c.end, now) ? ' (finished)' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={PhoneOff}
        title="No callback dates"
        hint="On these dates customers can’t book a callback slot. The date picker tells them, and bookings move to the next available day."
        action={<AddButton onClick={() => addRow('callback_blackouts', emptyBlackout)}>Add dates</AddButton>}
      >
        {form.callback_blackouts.length === 0 ? (
          <Empty>Callbacks can be booked on every working day</Empty>
        ) : (
          <div className="space-y-3">
            {form.callback_blackouts.map((b, i) => (
              <div
                key={i}
                data-testid="blackout-row"
                className={`flex flex-wrap items-end gap-3 rounded-md border border-border/60 p-3 ${isPast(b.end_date, now) ? 'opacity-60' : ''}`}
              >
                <Field label="First date">
                  <input type="date" className={inputCls} value={b.start_date}
                    onChange={e => setRow('callback_blackouts', i, { start_date: e.target.value })} />
                </Field>
                <Field label="Last date (included)">
                  <input type="date" className={inputCls} value={b.end_date}
                    onChange={e => setRow('callback_blackouts', i, { end_date: e.target.value })} />
                </Field>
                <Field label="Note (optional)" className="min-w-40 flex-1">
                  <input className={inputCls} value={b.name} maxLength={MAX_NAME}
                    onChange={e => setRow('callback_blackouts', i, { name: e.target.value })} placeholder="e.g. Office closed" />
                </Field>
                <RemoveButton label={`Remove no-callback dates ${i + 1}`} onClick={() => removeRow('callback_blackouts', i)} />
                {b.start_date && b.end_date && b.end_date >= b.start_date && (
                  <p className="basis-full text-[11px] text-muted-foreground">
                    No callbacks {prettyWhen(b.start_date)}
                    {b.end_date !== b.start_date ? ` to ${prettyWhen(b.end_date)}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={CalendarOff}
        title="Holidays"
        hint="Whole days the team is closed. The bot treats them like a Sunday."
        action={<AddButton onClick={() => addRow('holidays', emptyHoliday)}>Add holiday</AddButton>}
      >
        {form.holidays.length === 0 ? (
          <Empty>No holidays</Empty>
        ) : (
          <div className="space-y-2">
            {holidayRows.map(({ row, index }) => (
              <div
                key={index}
                data-testid="holiday-row"
                className={`flex flex-wrap items-end gap-3 ${isPast(row.date, now) ? 'opacity-60' : ''}`}
              >
                <Field label="Date">
                  <input type="date" className={inputCls} value={row.date}
                    onChange={e => setRow('holidays', index, { date: e.target.value })} />
                </Field>
                <Field label="Name" className="min-w-40 flex-1">
                  <input className={inputCls} value={row.name} maxLength={MAX_NAME}
                    onChange={e => setRow('holidays', index, { name: e.target.value })} placeholder="e.g. Diwali" />
                </Field>
                <RemoveButton label={`Remove holiday ${row.name || index + 1}`} onClick={() => removeRow('holidays', index)} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Save bar: sticks to the bottom of the page scroller, so it follows the content width */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-xs">
            {serverError ? (
              <div className="whitespace-pre-line text-red-700" role="alert">{serverError}</div>
            ) : problems.length > 0 ? (
              <ul className="space-y-0.5 text-red-700" role="alert">
                {problems.slice(0, 3).map(p => <li key={p}>{p}</li>)}
                {problems.length > 3 && <li>…and {problems.length - 3} more</li>}
              </ul>
            ) : dirty ? (
              <span className="text-muted-foreground">You have unsaved changes.</span>
            ) : (
              <span className="text-muted-foreground">Everything is saved.</span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setEdits(null)
              setServerError('')
            }}
          >
            Discard changes
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={!dirty || problems.length > 0 || save.isPending}
            onClick={() => {
              setServerError('')
              save.mutate(toPayload(form))
            }}
          >
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
