import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, GripVertical, MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createQuickReply,
  deleteQuickReply,
  listQuickReplies,
  reorderQuickReplies,
  updateQuickReply,
} from '@/lib/api'
import { MAX_ACTIVE, MAX_BODY, MAX_TITLE } from '@/lib/quickReplies'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { safeFormatDate } from '@/pages/users/utils'

const QUERY_KEY = ['quick-replies']

function Counter({ value, max }) {
  const over = value > max
  return (
    <span className={`text-[11px] tabular-nums ${over ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
      {value.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
    </span>
  )
}

function ReplyForm({ initial, saving, error, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [body, setBody] = useState(initial?.body || '')
  const titleLen = title.trim().length
  const bodyLen = body.trim().length
  const valid = titleLen > 0 && titleLen <= MAX_TITLE && bodyLen > 0 && bodyLen <= MAX_BODY
  const inputCls = 'w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <form
      className="executive-card mb-4 space-y-3 p-4"
      onSubmit={e => {
        e.preventDefault()
        if (valid) onSave({ title, body })
      }}
    >
      <div className="text-sm font-semibold">{initial ? 'Edit quick reply' : 'New quick reply'}</div>
      <label className="block space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Title</span>
          <Counter value={titleLen} max={MAX_TITLE} />
        </div>
        <input
          className={inputCls}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Store hours"
          autoFocus
        />
      </label>
      <label className="block space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Message</span>
          <Counter value={bodyLen} max={MAX_BODY} />
        </div>
        <textarea
          className={`${inputCls} min-h-28 resize-y leading-5`}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Hi {name}, our stores are open from 10:30 AM to 8:30 PM."
        />
        <span className="block text-[11px] text-muted-foreground">
          {'{name}'} becomes the customer’s first name. If we don’t know it, it is left out along with its comma.
        </span>
      </label>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={!valid || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function QuickRepliesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: QUERY_KEY, queryFn: listQuickReplies })
  const replies = data?.data || []
  const max = data?.max || MAX_ACTIVE

  const [editing, setEditing] = useState(null) // null | 'new' | reply id
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  // While dragging: the list in its in-progress order. Null otherwise.
  const [dragOrder, setDragOrder] = useState(null)
  const [dragId, setDragId] = useState(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const save = useMutation({
    mutationFn: ({ id, title, body }) => (id ? updateQuickReply(id, { title, body }) : createQuickReply({ title, body })),
    onSuccess: (_, { id }) => {
      toast.success(id ? 'Quick reply saved' : 'Quick reply added')
      setEditing(null)
      setFormError('')
      refresh()
    },
    onError: e => setFormError(e.message),
  })

  const remove = useMutation({
    mutationFn: id => deleteQuickReply(id),
    onSuccess: () => {
      toast.success('Quick reply deleted')
      setConfirmDelete(null)
      refresh()
    },
    onError: e => toast.error(e.message),
  })

  const reorder = useMutation({
    mutationFn: ids => reorderQuickReplies(ids),
    onMutate: async ids => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData(QUERY_KEY)
      const byId = Object.fromEntries((previous?.data || []).map(r => [r.id, r]))
      queryClient.setQueryData(QUERY_KEY, { ...previous, data: ids.map(id => byId[id]).filter(Boolean) })
      return { previous }
    },
    onError: (e, _, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous)
      toast.error(e.message || 'Couldn’t save the new order')
    },
    onSettled: refresh,
  })

  const shown = dragOrder || replies
  const saveOrder = list => {
    const ids = list.map(r => r.id)
    if (ids.join() !== replies.map(r => r.id).join()) reorder.mutate(ids)
  }
  const move = (index, step) => {
    const list = [...replies]
    const [item] = list.splice(index, 1)
    list.splice(index + step, 0, item)
    saveOrder(list)
  }
  const dragOver = (e, overId) => {
    e.preventDefault()
    if (!dragId || overId === dragId) return
    const list = [...(dragOrder || replies)]
    const from = list.findIndex(r => r.id === dragId)
    const to = list.findIndex(r => r.id === overId)
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    setDragOrder(list)
  }
  const dragEnd = () => {
    if (dragOrder) saveOrder(dragOrder)
    setDragOrder(null)
    setDragId(null)
  }

  const atLimit = replies.length >= max
  const startEdit = id => {
    setFormError('')
    setConfirmDelete(null)
    setEditing(id)
  }

  return (
    <div>
      <PageHeader
        title="Quick replies"
        description={`Saved messages agents can insert into a chat, edit, then send. ${replies.length} of ${max} used.`}
        action={
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={atLimit || editing === 'new'}
            title={atLimit ? `You can have at most ${max} quick replies — delete one first` : undefined}
            onClick={() => startEdit('new')}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> New quick reply
          </Button>
        }
      />

      <p className="mb-3 text-xs text-muted-foreground">
        In a chat you have taken over, click the <MessageSquareText className="inline h-3.5 w-3.5" /> button or type “/” at
        the start of the message box. Drag the rows to change the order agents see.
      </p>

      {editing === 'new' && (
        <ReplyForm
          saving={save.isPending}
          error={formError}
          onSave={values => save.mutate(values)}
          onCancel={() => setEditing(null)}
        />
      )}

      {isError && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadError?.message || 'Couldn’t load quick replies'}
        </div>
      )}

      <div className="executive-card divide-y divide-border/50 overflow-hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>
          ))
        ) : shown.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            <MessageSquareText className="mx-auto mb-2 h-8 w-8 opacity-30" />
            No quick replies yet
          </div>
        ) : (
          shown.map((r, i) =>
            editing === r.id ? (
              <div key={r.id} className="p-3">
                <ReplyForm
                  initial={r}
                  saving={save.isPending}
                  error={formError}
                  onSave={values => save.mutate({ id: r.id, ...values })}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <div
                key={r.id}
                data-testid="quick-reply-row"
                draggable={!editing}
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDragId(r.id)
                }}
                onDragOver={e => dragOver(e, r.id)}
                onDrop={e => e.preventDefault()}
                onDragEnd={dragEnd}
                className={`flex items-start gap-3 px-3 py-3 ${dragId === r.id ? 'bg-[rgb(var(--violet-rgb)/0.06)] opacity-70' : ''}`}
              >
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{r.body}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {r.updated_by ? `Last changed by ${r.updated_by}` : ''}{r.updated_at ? ` · ${safeFormatDate(r.updated_at)}` : ''}
                  </div>
                </div>
                {confirmDelete === r.id ? (
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span>Delete “{r.title}”?</span>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={remove.isPending} onClick={() => remove.mutate(r.id)}>
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Move up" aria-label={`Move ${r.title} up`}
                      disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Move down" aria-label={`Move ${r.title} down`}
                      disabled={i === shown.length - 1 || reorder.isPending} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" aria-label={`Edit ${r.title}`} onClick={() => startEdit(r.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" title="Delete"
                      aria-label={`Delete ${r.title}`} onClick={() => setConfirmDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ),
          )
        )}
      </div>
    </div>
  )
}
