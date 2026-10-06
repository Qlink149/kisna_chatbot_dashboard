import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, Settings2 } from 'lucide-react'
import { previewOf } from '@/lib/quickReplies'

// The list above the composer. Opened by the "Quick replies" button (with its
// own search box) or by typing "/" at the start of the composer (the composer
// text is the filter). AgentFooter owns the state; this only renders it.
export default function QuickRepliesPicker({
  replies,
  loading,
  error,
  query,
  customerFirstName,
  activeIndex,
  onActiveIndexChange,
  onPick,
  showSearch,
  onSearchChange,
  onSearchKeyDown,
}) {
  const listRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  let empty = null
  if (loading) empty = <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading quick replies…</span>
  else if (error) empty = 'Couldn’t load quick replies — try again in a moment.'
  else if (!replies.length && query.trim()) empty = `No quick replies match “${query.trim()}”`
  else if (!replies.length) empty = 'No quick replies yet — add some in Manage quick replies.'

  return (
    <div
      className="absolute bottom-full left-3 right-3 z-20 mb-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      data-testid="quick-replies-picker"
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs font-semibold">Quick replies</span>
        <span className="text-[10px] text-muted-foreground">↑↓ to move · Enter to insert · Esc to close</span>
      </div>
      {showSearch && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search quick replies"
            aria-label="Search quick replies"
            className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
      <div ref={listRef} role="listbox" aria-label="Quick replies" className="max-h-64 overflow-y-auto py-1">
        {empty ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">{empty}</div>
        ) : (
          replies.map((r, i) => (
            <div
              key={r.id}
              role="option"
              aria-selected={i === activeIndex}
              data-index={i}
              // mousedown would move focus off the composer before the click lands
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(i)}
              onClick={() => onPick(r)}
              className={`cursor-pointer px-3 py-1.5 ${i === activeIndex ? 'bg-[rgb(var(--violet-rgb)/0.08)]' : ''}`}
            >
              <div className="truncate text-sm font-medium">{r.title}</div>
              <div className="truncate text-xs text-muted-foreground">{previewOf(r.body, customerFirstName)}</div>
            </div>
          ))
        )}
      </div>
      <div className="border-t px-3 py-1.5">
        <Link
          to="/quick-replies"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" /> Manage quick replies
        </Link>
      </div>
    </div>
  )
}
