// Support hours page: form <-> API shape, and the same checks the server makes
// (kisna_chatbot/utils/support_schedule.py) so mistakes show up before Save.
// Times are IST everywhere; the bot reads whatever is saved within seconds.

export const MAX_AWAY_MESSAGE = 600
export const MAX_NAME = 80

export const emptyHoliday = () => ({ date: '', name: '' })
export const emptyClosure = () => ({ name: '', start: '', end: '' })
export const emptyBlackout = () => ({ name: '', start_date: '', end_date: '' })

// What GET /system/support-schedule returns -> editable form state.
export function toForm(data) {
  const weekly = data?.weekly || {}
  return {
    away_message: data?.away_message || '',
    weekly: {
      weekday_open: weekly.weekday_open || '10:00',
      weekday_close: weekly.weekday_close || '18:30',
      saturday_open: weekly.saturday_open || '10:00',
      saturday_close: weekly.saturday_close || '16:00',
    },
    holidays: (data?.holidays || []).map(h => ({ date: h.date, name: h.name })),
    closures: (data?.closures || []).map(c => ({ name: c.name, start: c.start, end: c.end })),
    callback_blackouts: (data?.callback_blackouts || []).map(b => ({
      name: b.name || '',
      start_date: b.start_date,
      end_date: b.end_date,
    })),
  }
}

const blank = (row, keys) => keys.every(k => !String(row[k] || '').trim())

// Form state -> PUT body. Rows the user added but never filled in are dropped.
export function toPayload(form) {
  const clean = (rows, keys) =>
    rows
      .filter(r => !blank(r, keys))
      .map(r => Object.fromEntries(keys.map(k => [k, String(r[k] || '').trim()])))
  return {
    weekly: { ...form.weekly },
    away_message: (form.away_message || '').trim(),
    holidays: clean(form.holidays, ['date', 'name']),
    closures: clean(form.closures, ['name', 'start', 'end']),
    callback_blackouts: clean(form.callback_blackouts, ['name', 'start_date', 'end_date']),
  }
}

// A list of plain-English problems; empty means "safe to save".
export function validate(form) {
  const errors = []
  const w = form.weekly
  if (!w.weekday_open || !w.weekday_close || w.weekday_open >= w.weekday_close) {
    errors.push('Mon–Fri: opening time must be before closing time.')
  }
  if (!w.saturday_open || !w.saturday_close || w.saturday_open >= w.saturday_close) {
    errors.push('Saturday: opening time must be before closing time.')
  }
  if ((form.away_message || '').trim().length > MAX_AWAY_MESSAGE) {
    errors.push(`The away message can be at most ${MAX_AWAY_MESSAGE} characters.`)
  }

  const p = toPayload(form)
  const seen = new Set()
  p.holidays.forEach((h, i) => {
    const label = `Holiday ${i + 1}`
    if (!h.date) errors.push(`${label}: choose a date.`)
    if (!h.name) errors.push(`${label}: add a name.`)
    if (h.name.length > MAX_NAME) errors.push(`${label}: name is too long (max ${MAX_NAME}).`)
    if (h.date) {
      if (seen.has(h.date)) errors.push(`${label}: ${h.date} is listed twice.`)
      seen.add(h.date)
    }
  })
  p.closures.forEach((c, i) => {
    const label = `Closure ${i + 1}`
    if (!c.name) errors.push(`${label}: add a reason.`)
    if (c.name.length > MAX_NAME) errors.push(`${label}: reason is too long (max ${MAX_NAME}).`)
    if (!c.start || !c.end) errors.push(`${label}: set both the start and the end.`)
    else if (c.end <= c.start) errors.push(`${label}: the end must be after the start.`)
  })
  p.callback_blackouts.forEach((b, i) => {
    const label = `No-callback dates ${i + 1}`
    if (!b.start_date || !b.end_date) errors.push(`${label}: set both dates.`)
    else if (b.end_date < b.start_date) errors.push(`${label}: the last date can’t be before the first.`)
    if (b.name.length > MAX_NAME) errors.push(`${label}: note is too long (max ${MAX_NAME}).`)
  })
  return errors
}

// Compare what is on screen with what is saved, ignoring blank rows.
export const isDirty = (form, saved) => JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(saved))

// True when an entry is wholly in the past (IST wall-clock strings compare as text).
export function isPast(value, nowIso) {
  if (!value) return false
  return value.slice(0, nowIso.length) < nowIso.slice(0, value.length)
}

// "2026-11-07T12:00" -> "7 Nov 2026, 12:00 PM"; "2026-11-07" -> "7 Nov 2026"
export function prettyWhen(value) {
  if (!value) return ''
  const [d, t] = value.split('T')
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = `${day} ${months[m - 1]} ${y}`
  if (!t) return date
  const [hh, mm] = t.split(':').map(Number)
  const h12 = hh % 12 || 12
  return `${date}, ${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}
