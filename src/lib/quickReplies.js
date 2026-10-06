// Quick replies: pure helpers shared by the composer picker and the manage
// page. No React here so they run under `node --test`.

export const MAX_TITLE = 40
export const MAX_BODY = 1024
export const MAX_ACTIVE = 50

const NOT_A_NAME = new Set(['none', 'null', 'customer', 'user'])
const PLACEHOLDER = /\{\s*name\s*\}/i

// Same rule as the bot's greeting_first_name(): first word of the profile
// name, title-cased; null when it is not letters only (any script) or is
// longer than 20 characters.
export function firstNameFrom(username) {
  if (typeof username !== 'string' || !username.trim()) return null
  const word = username.trim().split(/\s+/)[0]
  if (word.length > 20 || !/^\p{L}[\p{L}\p{M}]*$/u.test(word) || NOT_A_NAME.has(word.toLowerCase())) return null
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

// {name} -> the customer's first name. Without a name the placeholder goes,
// with the comma/space that joins it to the sentence:
//   "Hi {name}, thanks"  -> "Hi, thanks"
//   "Thank you, {name}." -> "Thank you."
//   "{name}, your order" -> "Your order"
export function fillName(body, name) {
  const text = String(body ?? '')
  if (!PLACEHOLDER.test(text)) return text
  if (name) return text.replace(/\{\s*name\s*\}/gi, name)
  return text
    .split('\n')
    .map(line => {
      const lead = line.match(/^(\s*)\{\s*name\s*\}[ \t]*[,:]?[ \t]*/i)
      if (lead) {
        const rest = line.slice(lead[0].length)
        line = lead[1] + rest.charAt(0).toUpperCase() + rest.slice(1)
      }
      return line.replace(/,?[ \t]*\{\s*name\s*\}/gi, '')
    })
    .join('\n')
}

// One line for the list: newlines collapsed, name filled.
export function previewOf(body, name) {
  return fillName(body, name).replace(/\s+/g, ' ').trim()
}

// Case-insensitive; every word of the query must appear in the title or body.
// Keeps the saved order.
export function filterReplies(replies, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return replies || []
  return (replies || []).filter(r => {
    const hay = `${r.title}\n${r.body}`.toLowerCase()
    return words.every(w => hay.includes(w))
  })
}

// The "/" trigger: the first line starts with "/" -> the text after it is the
// filter. Returns null when the box is not a "/" command.
export function slashQuery(input) {
  const text = String(input ?? '')
  if (!text.startsWith('/')) return null
  const firstLine = text.split('\n')[0]
  return firstLine.slice(1)
}

// Text after inserting `insert` into `value` at [start, end). An empty box is
// replaced outright. Returns {value, caret}.
export function insertAt(value, insert, start, end) {
  const text = String(value ?? '')
  if (!text.trim()) return { value: insert, caret: insert.length }
  const s = Math.max(0, Math.min(start ?? text.length, text.length))
  const e = Math.max(s, Math.min(end ?? s, text.length))
  return { value: text.slice(0, s) + insert + text.slice(e), caret: s + insert.length }
}

// Replace the "/query" first line with `insert`, keeping anything typed below it.
export function replaceSlash(value, insert) {
  const text = String(value ?? '')
  const nl = text.indexOf('\n')
  const rest = nl === -1 ? '' : text.slice(nl)
  return { value: insert + rest, caret: insert.length }
}
