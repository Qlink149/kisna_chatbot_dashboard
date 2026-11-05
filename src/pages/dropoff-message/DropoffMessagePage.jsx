import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquareText } from 'lucide-react'
import { getDropoffMessage, saveDropoffMessage } from '@/lib/api'
import { cleanMessage, isDirty, validate } from '@/lib/dropoffMessage'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { safeFormatDate } from '@/pages/users/utils'

const QUERY_KEY = ['dropoff-message']
const DESCRIPTION = 'The message customers receive when they stop replying.'

export default function DropoffMessagePage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: QUERY_KEY, queryFn: getDropoffMessage })
  // The user's unsaved edit, or null while there is none, so a background
  // refetch can never wipe what they are typing.
  const [edit, setEdit] = useState(null)
  const [serverError, setServerError] = useState('')

  const save = useMutation({
    mutationFn: body => saveDropoffMessage(body),
    onSuccess: res => {
      toast.success('Saved — the next drop-off message uses this')
      setServerError('')
      queryClient.setQueryData(QUERY_KEY, res)
      setEdit(null)
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

  const text = edit ?? data.message
  const custom = data.source === 'custom'
  const length = cleanMessage(text).length
  const problems = validate(text, data.max_chars)
  const dirty = isDirty(text, data.message)

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
          {data.enabled ? `Sending: ${custom ? 'your message' : 'the automatic message'}` : 'Sending is turned off'}
        </span>
        {custom && (
          <span className="text-muted-foreground">
            Last changed by {data.updated_by || 'someone'}
            {data.updated_at ? ` · ${safeFormatDate(data.updated_at)}` : ''}
          </span>
        )}
      </div>

      <section className="executive-card mb-4 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Message
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Sent once when a customer goes quiet for {data.delay_hours} hours, and at most once every {data.cooldown_days} days per
              customer. English customers receive exactly what you see here; customers writing in another language get it translated.
            </p>
          </div>
          {custom && (
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => setEdit(data.automatic_message)}>
              Use automatic message
            </Button>
          )}
        </div>

        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {custom
            ? 'Your message is sent exactly as written. Its % OFF figures and offer dates do not update by themselves, so change them here when an offer changes or ends.'
            : 'This message updates by itself: the % OFF figures come from your live offers, and ended offers drop out. If you edit and save it, your text replaces it, and its figures and dates stop updating by themselves.'}
        </div>

        <div className="mb-1 flex justify-end">
          <span className={`text-[11px] tabular-nums ${length > data.max_chars ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
            {length.toLocaleString('en-IN')} / {data.max_chars.toLocaleString('en-IN')}
          </span>
        </div>
        <textarea
          className="min-h-96 w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={text}
          onChange={e => setEdit(e.target.value)}
          aria-label="Drop-off message"
        />
        {!cleanMessage(text) && (
          <p className="mt-1 text-xs text-muted-foreground">An empty message goes back to the automatic one when you save.</p>
        )}
      </section>

      {/* Save bar: sticks to the bottom of the page scroller, so it follows the content width */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-xs">
            {serverError ? (
              <div className="whitespace-pre-line text-red-700" role="alert">{serverError}</div>
            ) : problems.length > 0 ? (
              <div className="text-red-700" role="alert">{problems[0]}</div>
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
              setEdit(null)
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
              save.mutate({ message: cleanMessage(text) })
            }}
          >
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
