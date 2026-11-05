import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock, MessageSquareText } from 'lucide-react'
import { getDropoffMessage, saveDropoffMessage } from '@/lib/api'
import { cleanText, isDirty, toPayload, validate } from '@/lib/dropoffMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { safeFormatDate } from '@/pages/users/utils'

const QUERY_KEY = ['dropoff-message']
const DESCRIPTION = 'The message customers receive when they stop replying.'

function WordingBox({ label, hint, value, maxChars, onChange }) {
  const length = cleanText(value).length
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs">
          <span className="font-semibold">{label}</span>
          <span className="text-muted-foreground"> · {hint}</span>
        </span>
        <span className={`text-[11px] tabular-nums ${length > maxChars ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
          {length.toLocaleString('en-IN')} / {maxChars.toLocaleString('en-IN')}
        </span>
      </div>
      <textarea
        className="min-h-24 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
      />
      {!length && <p className="mt-1 text-xs text-muted-foreground">An empty box goes back to the standard wording when you save.</p>}
    </div>
  )
}

export default function DropoffMessagePage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: QUERY_KEY, queryFn: getDropoffMessage })
  // The user's unsaved edits, or null while there are none, so a background
  // refetch can never wipe what they are typing.
  const [edits, setEdits] = useState(null)
  const [serverError, setServerError] = useState('')

  const save = useMutation({
    mutationFn: body => saveDropoffMessage(body),
    onSuccess: res => {
      toast.success('Saved — the next drop-off message uses this')
      setServerError('')
      queryClient.setQueryData(QUERY_KEY, res)
      setEdits(null)
    },
    onError: e => setServerError(e.message),
  })

  if (isError) {
    return (
      <div>
        <PageHeader title="Drop-off message" />
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError?.message || 'Couldn’t load the drop-off message'}
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Drop-off message" description={DESCRIPTION} />
        <div className="executive-card mb-4 p-4"><Skeleton className="h-64 w-full" /></div>
      </div>
    )
  }

  const saved = { header: data.header, footer: data.footer }
  const form = edits ?? saved
  const setField = (key, value) => setEdits({ ...form, [key]: value })
  const problems = validate(form, data.max_chars)
  const dirty = isDirty(form, saved)
  const standard = { header: data.standard_header, footer: data.standard_footer }

  return (
    <div>
      <PageHeader title="Drop-off message" description={DESCRIPTION} />

      <div
        className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs ${
          data.enabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        <span className="font-semibold">
          {data.enabled ? 'This message is being sent to customers' : 'This message is not being sent right now'}
        </span>
        {data.updated_at && (
          <span className="text-muted-foreground">
            Last changed by {data.updated_by || 'someone'} · {safeFormatDate(data.updated_at)}
          </span>
        )}
      </div>

      <section className="executive-card mb-4 space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Message
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              A customer gets this if they stop replying for {data.delay_hours} hours, at most once every {data.cooldown_days} days. It
              reads from top to bottom, just as it appears here. Customers writing in another language get it translated.
            </p>
          </div>
          {isDirty(form, standard) && (
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => setEdits(standard)}>
              Use standard wording
            </Button>
          )}
        </div>

        <WordingBox label="Top text" hint="you can edit this" value={form.header} maxChars={data.max_chars} onChange={v => setField('header', v)} />

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> Offers (updated automatically)
          </div>
          <div
            className="whitespace-pre-wrap rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm leading-5 text-muted-foreground"
            data-testid="dropoff-offers"
          >
            {data.offers}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You don’t need to change this part. The % OFF figures come from your live offers, and ended offers drop out by themselves.
            To add or remove an offer here, please contact the Clara team.
          </p>
        </div>

        <WordingBox label="Bottom text" hint="you can edit this" value={form.footer} maxChars={data.max_chars} onChange={v => setField('footer', v)} />
      </section>

      {/* Save bar: sticks to the bottom of the page scroller, so it follows the content width */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-xs">
            {serverError ? (
              <div className="whitespace-pre-line text-red-700" role="alert">{serverError}</div>
            ) : problems.length > 0 ? (
              <ul className="space-y-0.5 text-red-700" role="alert">
                {problems.map(p => <li key={p}>{p}</li>)}
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
