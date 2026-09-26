// Mirrors the backend (kisna_chatbot/utils/whatsapp_window.py): Meta's 24h
// window runs from the customer's last INBOUND message, and the backend stops
// at 23h for margin. updated_at is only a last resort for old user docs --
// agent messages refresh it, which is how takeover/send kept being offered
// after Meta had already closed the window (error 131047).
const WINDOW_OPEN_SECONDS = 23 * 3600

function toEpochSeconds(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value > 100000000000 ? value / 1000 : value
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms / 1000
}

export function isWindowExpired(user) {
  if (!user) return false
  const ts =
    toEpochSeconds(user.last_inbound_at) ??
    toEpochSeconds(user.last_message_at) ??
    toEpochSeconds(user.updated_at)
  if (ts === null) return false
  return Date.now() / 1000 - ts > WINDOW_OPEN_SECONDS
}

export function safeFormatDate(dateVal) {
  if (!dateVal) return ''
  try {
    const parsedObj = typeof dateVal === 'number' && dateVal < 100000000000
      ? new Date(dateVal * 1000)
      : new Date(dateVal)
    return parsedObj.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
  } catch (e) {
    return String(dateVal).split('T')[0]
  }
}
