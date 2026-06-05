import { Loader2, Sparkles, User, MessageSquare, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatMsgTime(ts) {
  if (!ts) return null
  return new Date(ts * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function renderMessageContent(content) {
  if (!content) return null
  const parts = content.split(/(\[.*?\])/g)
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return <span key={i} className="font-semibold text-primary">{part}</span>
    }
    return <span key={i}>{part}</span>
  })
}

export default function ChatMessages({
  activePhone,
  loadingActive,
  chatHistory,
  scrollRef,
  showScrollBottom,
  onScroll,
  onScrollToBottom,
}) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 relative"
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
        <div className="relative pb-10 space-y-4">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/10 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-indigo-500/10">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}

              {msg.role === 'agent' && (
                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm border border-amber-500/20">
                  <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
              )}

              <div
                className={`relative max-w-[75%] px-3.5 py-2.5 rounded-2xl shadow-sm text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                    : msg.role === 'agent'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 rounded-tl-none border border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-border/50'
                }`}
              >
                {msg.role === 'agent' && (
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wider">
                    Live Agent
                  </p>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {renderMessageContent(msg.content)}
                </div>
                <p className="text-[9px] text-right mt-1 opacity-80 select-none">
                  {formatMsgTime(msg.timestamp) ?? '—'}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 ml-2 mt-1 border border-border">
                  <User className="h-4 w-4 text-zinc-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
