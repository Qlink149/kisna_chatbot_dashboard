import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Small building blocks shared by the Wallet sections.

// `flush` drops the body padding so a table can run edge to edge.
export function Section({ title, icon: Icon, action, children, flush = false }) {
  return (
    <section className={`executive-card mb-4 ${flush ? 'overflow-hidden' : 'p-4'}`}>
      <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${flush ? 'px-4 pt-4' : ''}`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ErrorBox({ children }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
      {children}
    </div>
  )
}

export function Pager({ page, limit, total, onPage }) {
  const totalPages = Math.ceil(total / limit) || 1
  if (total <= limit) return null
  return (
    <div className="flex items-center justify-between border-t bg-white px-4 py-2.5">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages} · {total.toLocaleString('en-IN')} total
      </span>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function SkeletonRows({ rows = 6, cols }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-b">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  ))
}

export function Th({ children, right = false }) {
  return (
    <th className={`px-4 py-3 text-xs uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{children}</th>
  )
}

const PILL = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  violet: 'bg-[rgb(var(--violet-rgb)/0.08)] text-[var(--violet)] border-[rgb(var(--violet-rgb)/0.3)]',
  grey: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export function Pill({ tone = 'grey', children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium ${PILL[tone] || PILL.grey}`}>
      {children}
    </span>
  )
}
