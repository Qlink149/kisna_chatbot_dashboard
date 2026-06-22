import { User, Clock, Gem, X } from 'lucide-react'
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
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/30 flex items-center justify-center mb-3 border-2 border-[#C9A84C]/20">
            <User className="h-10 w-10 text-[#C9A84C]" />
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
      </div>
    </div>
  )
}
