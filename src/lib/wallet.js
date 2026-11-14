// Pure helpers for the Wallet page. Money arrives as decimal rupee strings
// ("3.50") and times as epoch seconds; IST is applied here, in the browser.

export const TOPUP_MIN = 100
export const TOPUP_MAX = 100000
export const TOPUP_PICKS = [500, 1000, 2000, 5000]
export const CHARGE_STATUSES = ['PENDING', 'STUCK', 'REJECTED', 'CHARGED', 'SHADOW']

const IST = 'Asia/Kolkata'

const toNumber = value => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// "1234.5" -> "₹1,234.50"; null/garbage -> "—".
export function formatRupees(value) {
  const n = toNumber(value)
  if (n === null) return '—'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCount(value) {
  const n = toNumber(value)
  return n === null ? '—' : n.toLocaleString('en-IN')
}

// Epoch seconds -> "11 Nov, 3:05 pm" in IST.
export function formatIST(epochSeconds, { withYear = false } = {}) {
  const n = toNumber(epochSeconds)
  if (!n) return '—'
  return new Date(n * 1000).toLocaleString('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// "2026-11-11" -> "11 Nov" (the date is already an IST calendar day).
export function formatDay(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' })
}

// Seconds -> "45s", "12m", "3h 5m", "2d 4h".
export function durationText(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`
}

// Epoch seconds -> "5m ago" / "just now". `now` is in ms, for tests.
export function relativeTime(epochSeconds, now = Date.now()) {
  const n = toNumber(epochSeconds)
  if (!n) return ''
  const diff = now / 1000 - n
  if (diff < 45) return 'just now'
  return `${durationText(diff)} ago`
}

export function runwayText(runwayDays) {
  const n = toNumber(runwayDays)
  if (n === null) return 'Not enough data yet'
  if (n < 1) return 'Under a day left'
  const rounded = n < 10 ? Math.round(n * 10) / 10 : Math.round(n)
  return `About ${rounded.toLocaleString('en-IN')} day${rounded === 1 ? '' : 's'} left`
}

export const MODE_LABELS = {
  off: 'Off',
  shadow: 'Shadow — counting only, never charged',
  live: 'Live',
}

export const modeLabel = mode => MODE_LABELS[mode] || 'Unknown'

export function walletStatusLabel(status) {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'PAUSED') return 'Paused'
  return 'Unknown'
}

// PENDING + STUCK: charges the wallet has not confirmed yet.
export function unconfirmedCount(byStatus) {
  return (Number(byStatus?.PENDING) || 0) + (Number(byStatus?.STUCK) || 0)
}

export function statusTotal(byStatus) {
  return CHARGE_STATUSES.reduce((sum, s) => sum + (Number(byStatus?.[s]) || 0), 0)
}

// The amount box -> a problem to show, or '' when it is fine to quote.
export function topupProblem(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return 'Enter an amount'
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return 'Enter an amount in rupees, like 1000'
  const n = Number(text)
  if (n < TOPUP_MIN) return `The smallest top-up is ${formatRupees(TOPUP_MIN)}`
  if (n > TOPUP_MAX) return `The largest top-up is ${formatRupees(TOPUP_MAX)}`
  return ''
}

// Bars for the daily chart. Each day's amount is split between charged and
// shadow in proportion to those bundle counts; anything else (pending, stuck,
// rejected) is "other". Heights are % of the busiest day.
export function dailyBars(days) {
  const list = Array.isArray(days) ? days : []
  const amounts = list.map(d => toNumber(d.amount_rupees) || 0)
  const max = Math.max(0, ...amounts)
  return list.map((d, i) => {
    const amount = amounts[i]
    const bundles = Number(d.bundles) || 0
    const charged = Number(d.charged) || 0
    const shadow = Number(d.shadow) || 0
    const pct = max > 0 ? (amount / max) * 100 : 0
    const share = n => (bundles > 0 ? Math.min(1, n / bundles) : 0)
    const chargedPct = pct * share(charged)
    const shadowPct = pct * share(shadow)
    return {
      date: d.date,
      bundles,
      amount,
      charged,
      shadow,
      chargedPct,
      shadowPct,
      otherPct: Math.max(0, pct - chargedPct - shadowPct),
    }
  })
}

// Classic trailing debounce; `cancel()` drops a pending call.
export function debounce(fn, ms) {
  let timer = null
  const wrapped = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, ms)
  }
  wrapped.cancel = () => {
    clearTimeout(timer)
    timer = null
  }
  return wrapped
}

// "≈ 13 bundles (260 messages)" from the balance: how much chat the client
// has left before the wallet pauses. Null when the balance isn't known.
export function bundlesLeftText(balanceRupees, bundlePriceRupees, bundleSize) {
  const balance = Number(balanceRupees)
  const price = Number(bundlePriceRupees)
  const size = Number(bundleSize)
  if (balanceRupees == null || !Number.isFinite(balance) || !(price > 0) || !(size > 0)) return null
  if (balance <= 0) return 'no bundles left'
  const bundles = Math.floor(balance / price)
  if (bundles === 0) return 'less than 1 bundle left'
  const messages = bundles * size
  return `≈ ${bundles.toLocaleString('en-IN')} bundle${bundles === 1 ? '' : 's'} left (${messages.toLocaleString('en-IN')} messages)`
}
