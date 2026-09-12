import { useRef, useState } from 'react'
import { AlertTriangle, Check, FileText, Loader2, Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
}) {
  const fileInputRef = useRef(null)
  const [attachedFile, setAttachedFile] = useState(null)
  const [fileError, setFileError] = useState('')

  if (!isTakenOver) {
    return (
      <div className="p-3 bg-[rgb(var(--mist-rgb)/0.5)] border-t text-center shrink-0">
        <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> Read-only — bot is handling this conversation
        </p>
      </div>
    )
  }

  const busy = sendingMessage || sendingMedia

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
      <div className="p-3 flex items-center gap-2">
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
        <Input
          className="flex-1 h-10"
          placeholder={attachedFile ? 'Add a caption (optional)...' : 'Type a message as live agent...'}
          value={agentInput}
          onChange={e => onAgentInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={busy || isWindowExpired}
        />
        <Button
          size="icon" className="h-10 w-10 shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
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
