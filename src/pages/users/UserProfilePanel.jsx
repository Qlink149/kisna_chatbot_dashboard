import { useState } from 'react'
import { User, Clock, Gem, X, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { safeFormatDate } from './utils'

function hasJewelleryProfile(profile) {
  if (!profile || typeof profile !== 'object') return false
  return Boolean(
    profile.material_preference
    || profile.category_preference
    || profile.budget_range
    || profile.occasion
  )
}

function formatPrice(price) {
  if (price == null || price === '') return null
  if (typeof price === 'object') {
    if (price.display_price != null) price = price.display_price
    else if (price.variantPrice != null) price = price.variantPrice
    else if (price.finalPrice != null) price = price.finalPrice
    else return null
  }
  if (typeof price === 'number') return `₹${price.toLocaleString('en-IN')}`
  return String(price)
}

// Live session flags that explain the bot's current behaviour. All of this was
// already in the /system/user response and was being fetched then discarded.
const SESSION_FIELDS = [
  ['service_selected', 'Service'],
  ['language_override', 'Language lock'],
  ['pending_search', 'Pending search'],
  ['pending_clarification', 'Pending clarification'],
  ['awaiting_rating', 'Awaiting rating'],
  ['shopping_wizard_active', 'Wizard active'],
  ['shopping_wizard_step', 'Wizard step'],
  ['callback_capture_step', 'Callback step'],
]

function renderValue(value) {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  if (value == null || value === '') return null
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function SessionStateSection({ userData }) {
  const [open, setOpen] = useState(false)

  const rows = SESSION_FIELDS
    .map(([key, label]) => [label, renderValue(userData[key])])
    .filter(([, value]) => value != null)

  const filters = userData.last_search_filters
  const takeover = userData.human_takeover
  const stats = userData.stats || {}
  const avgMs = stats.response_count
    ? Math.round(stats.total_response_time_ms / stats.response_count)
    : null

  if (takeover?.active) {
    rows.unshift(['Human takeover', `active${takeover.taken_by ? ` — ${takeover.taken_by}` : ''}`])
  }
  if (userData.live_agent_required) {
    rows.unshift(['Agent requested', safeFormatDate(userData.live_agent_requested_at) || 'yes'])
  }
  if (avgMs != null) {
    rows.push(['Avg response', `${avgMs} ms over ${stats.response_count} replies`])
  }

  const hasFilters = filters && Object.keys(filters).length > 0
  if (!rows.length && !hasFilters) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 mb-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Session State
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 text-xs">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right break-words min-w-0">{value}</span>
            </div>
          ))}
          {hasFilters && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Last search filters
              </p>
              <pre className="max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-100">
                {JSON.stringify(filters, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UserProfilePanel({ userData, onClose }) {
  const jewelleryProfile = userData.jewellery_profile || {}
  const lastViewed = userData.last_viewed_product || null
  const showProfile = hasJewelleryProfile(jewelleryProfile)

  return (
    <div className="w-80 border-l flex flex-col min-h-0 bg-card overflow-hidden shrink-0">
      <div className="h-16 px-4 flex items-center justify-between border-b shrink-0">
        <h3 className="text-sm font-bold">User Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 overscroll-y-contain p-4 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center pb-4 border-b">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center mb-3 border-2"
            style={{
              background: 'linear-gradient(to bottom right, rgb(var(--violet-rgb) / 0.15), rgb(var(--royal-rgb) / 0.12))',
              borderColor: 'rgb(var(--violet-rgb) / 0.18)',
            }}
          >
            <User className="h-10 w-10" style={{ color: 'var(--violet)' }} />
          </div>
          <h4 className="text-base font-bold">{userData.username || 'Unknown User'}</h4>
          <p className="text-xs text-muted-foreground font-mono mt-1">+{userData.phone_number}</p>
          {userData.updated_at && (
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last active: {safeFormatDate(userData.updated_at)}
            </p>
          )}
        </div>

        {/* Jewellery Profile */}
        {showProfile && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <Gem className="h-3 w-3" /> Jewellery Profile
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              {jewelleryProfile.material_preference && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Material</span>
                  <Badge variant="secondary" className="capitalize text-xs">{jewelleryProfile.material_preference}</Badge>
                </div>
              )}
              {jewelleryProfile.category_preference && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Category</span>
                  <Badge variant="secondary" className="capitalize text-xs">{jewelleryProfile.category_preference}</Badge>
                </div>
              )}
              {jewelleryProfile.budget_range && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Budget</span>
                  <Badge variant="secondary" className="text-xs">{jewelleryProfile.budget_range}</Badge>
                </div>
              )}
              {jewelleryProfile.occasion && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Occasion</span>
                  <Badge variant="outline" className="capitalize text-[10px]">{jewelleryProfile.occasion}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Viewed Product */}
        {lastViewed?.title && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Last Viewed Product
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 flex gap-3 items-center">
              {(lastViewed.image_url_snapshot || lastViewed.mediaUrl || lastViewed.image_url || (lastViewed.images && lastViewed.images[0])) && (
                <div className="shrink-0">
                  <img
                    src={lastViewed.image_url_snapshot || lastViewed.mediaUrl || lastViewed.image_url || (lastViewed.images && lastViewed.images[0])}
                    alt={lastViewed.title}
                    className="w-12 h-12 rounded-md object-cover border bg-background"
                  />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-snug">{lastViewed.title}</p>
                {formatPrice(lastViewed.price) && (
                  <p className="text-xs text-muted-foreground">{formatPrice(lastViewed.price)}</p>
                )}
                {lastViewed.materialType && (
                  <p className="text-xs text-muted-foreground capitalize">{lastViewed.materialType}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Session state — why the bot is behaving the way it is right now */}
        <SessionStateSection userData={userData} />
      </div>
    </div>
  )
}
