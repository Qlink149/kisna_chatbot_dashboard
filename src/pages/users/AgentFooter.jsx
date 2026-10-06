import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, FileText, Loader2, MessageSquareText, Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { listQuickReplies } from '@/lib/api'
import { fillName, filterReplies, firstNameFrom, insertAt, replaceSlash, slashQuery } from '@/lib/quickReplies'
import QuickRepliesPicker from './QuickRepliesPicker'

const MAX_MEDIA_BYTES = 20 * 1024 * 1024 // 20 MB, mirrors KISNA_MEDIA_MAX_BYTES server-side
const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/mp4',
  'video/mp4', 'video/3gpp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
])

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AgentFooter({
  isTakenOver,
  isWindowExpired,
  agentInput,
  onAgentInputChange,
  sendingMessage,
  onSendMessage,
  sendingMedia,
  onSendMedia,
  customerName,
}) {
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  // Grow with the text (up to max-h-40, then scroll); shrink back after send.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [agentInput])
  const [attachedFile, setAttachedFile] = useState(null)
  const [fileError, setFileError] = useState('')

  // Quick replies: the button opens the list with its own search box; "/" at
  // the start of the composer opens it filtered by what follows. Picking one
  // only inserts text -- sending is still Enter / the Send button.
  const { data: quickReplyData, isLoading: quickRepliesLoading, isError: quickRepliesError } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: listQuickReplies,
    enabled: !!isTakenOver,
    staleTime: 30_000,
  })
  const [pickerFromButton, setPickerFromButton] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [slashDismissed, setSlashDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectionRef = useRef({ start: 0, end: 0 })
  const pendingCaretRef = useRef(null)
  const pickerWrapRef = useRef(null)

  const busy = sendingMessage || sendingMedia
  const composerEnabled = !!isTakenOver && !busy && !isWindowExpired
  const slash = slashQuery(agentInput)
  const slashOpen = composerEnabled && !pickerFromButton && slash !== null && !slashDismissed
  const pickerOpen = composerEnabled && (pickerFromButton || slashOpen)
  const pickerQuery = pickerFromButton ? pickerSearch : (slash ?? '')
  const matches = pickerOpen ? filterReplies(quickReplyData?.data, pickerQuery) : []
  const customerFirstName = firstNameFrom(customerName)

  // After an insert: focus the composer with the caret after the new text.
  useEffect(() => {
    const el = textareaRef.current
    if (!el || pendingCaretRef.current == null) return
    const caret = pendingCaretRef.current
    pendingCaretRef.current = null
    el.focus()
    el.setSelectionRange(caret, caret)
  }, [agentInput])

  // A click anywhere outside the list and composer closes the list.
  useEffect(() => {
    if (!pickerOpen) return
    const onDown = e => {
      if (pickerWrapRef.current?.contains(e.target)) return
      setPickerFromButton(false)
      setSlashDismissed(true)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pickerOpen])

  if (!isTakenOver) {
    return (
      <div className="p-3 bg-[rgb(var(--mist-rgb)/0.5)] border-t text-center shrink-0">
        <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> Read-only — bot is handling this conversation
        </p>
      </div>
    )
  }

  const clearAttachment = () => {
    setAttachedFile(null)
    setFileError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      setFileError(`Unsupported file type: ${file.type || 'unknown'}`)
      setAttachedFile(null)
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setFileError('File exceeds the 20 MB limit')
      setAttachedFile(null)
      return
    }
    setFileError('')
    setAttachedFile(file)
  }

  const handleSend = async () => {
    if (attachedFile) {
      await onSendMedia(attachedFile, agentInput.trim() || null)
      clearAttachment()
      onAgentInputChange('')
      return
    }
    onSendMessage()
  }

  const closePicker = () => {
    setPickerFromButton(false)
    setPickerSearch('')
    setSlashDismissed(true)
    setActiveIndex(0)
  }

  const pickQuickReply = reply => {
    const text = fillName(reply.body, customerFirstName)
    const { start, end } = selectionRef.current
    const next = pickerFromButton ? insertAt(agentInput, text, start, end) : replaceSlash(agentInput, text)
    closePicker()
    pendingCaretRef.current = next.caret
    onAgentInputChange(next.value)
    if (next.value === agentInput) textareaRef.current?.focus()
  }

  const togglePickerButton = () => {
    if (pickerFromButton) {
      closePicker()
      textareaRef.current?.focus()
      return
    }
    const el = textareaRef.current
    selectionRef.current = { start: el?.selectionStart ?? agentInput.length, end: el?.selectionEnd ?? agentInput.length }
    setPickerSearch('')
    setActiveIndex(0)
    setPickerFromButton(true)
  }

  // Arrow keys / Enter / Tab / Esc while the list is open. True when handled.
  const handlePickerKey = e => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePicker()
      textareaRef.current?.focus()
      return true
    }
    if (!matches.length) return false
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(i => (i + step + matches.length) % matches.length)
      return true
    }
    if ((e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) || e.key === 'Tab') {
      e.preventDefault()
      pickQuickReply(matches[Math.min(activeIndex, matches.length - 1)])
      return true
    }
    return false
  }

  const canSend = attachedFile ? !busy && !isWindowExpired : !!agentInput.trim() && !busy && !isWindowExpired

  return (
    <div className="bg-card border-t shrink-0">
      {isWindowExpired && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            WhatsApp 24-hour window has expired — the user must message first before you can reply.
          </p>
        </div>
      )}
      {fileError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{fileError}</p>
        </div>
      )}
      {attachedFile && (
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{attachedFile.name}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{formatSize(attachedFile.size)}</span>
            <button
              type="button"
              onClick={clearAttachment}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <div ref={pickerWrapRef} className="relative p-3 flex items-end gap-2">
        {pickerOpen && (
          <QuickRepliesPicker
            replies={matches}
            loading={quickRepliesLoading}
            error={quickRepliesError}
            query={pickerQuery}
            customerFirstName={customerFirstName}
            activeIndex={Math.min(activeIndex, Math.max(matches.length - 1, 0))}
            onActiveIndexChange={setActiveIndex}
            onPick={pickQuickReply}
            showSearch={pickerFromButton}
            onSearchChange={v => { setPickerSearch(v); setActiveIndex(0) }}
            onSearchKeyDown={handlePickerKey}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={[...ALLOWED_MEDIA_TYPES].join(',')}
          onChange={handleFilePick}
          disabled={busy || isWindowExpired}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || isWindowExpired}
          title="Attach a file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={pickerFromButton ? 'secondary' : 'outline'}
          className="h-10 w-10 shrink-0"
          onClick={togglePickerButton}
          disabled={busy || isWindowExpired}
          title="Quick replies (or type / in the message box)"
          aria-label="Quick replies"
          aria-expanded={pickerFromButton}
        >
          <MessageSquareText className="h-4 w-4" />
        </Button>
        {/* Enter sends; Shift+Enter inserts a newline. Enter while an IME is
            composing (Hindi/Gujarati keyboards) only confirms the word. While
            the "/" quick-reply list shows a match, Enter inserts it instead. */}
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 min-h-10 max-h-40 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={attachedFile ? 'Add a caption (optional)...' : 'Type a message as live agent... (/ for quick replies, Shift+Enter for a new line)'}
          value={agentInput}
          onChange={e => {
            // A fresh "/" (the box was not a "/" command before) reopens the list.
            if (slashQuery(agentInput) === null || slashQuery(e.target.value) === null) setSlashDismissed(false)
            setActiveIndex(0)
            onAgentInputChange(e.target.value)
          }}
          onKeyDown={e => {
            if (slashOpen && handlePickerKey(e)) return
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={busy || isWindowExpired}
        />
        <Button
          size="icon" className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSend}
          disabled={!canSend}
        >
          {busy
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
