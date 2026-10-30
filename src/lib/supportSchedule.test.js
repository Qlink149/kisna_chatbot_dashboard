// node --test src/lib/supportSchedule.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyBlackout,
  emptyClosure,
  emptyHoliday,
  isDirty,
  isPast,
  prettyWhen,
  toForm,
  toPayload,
  validate,
} from './supportSchedule.js'

const SAMPLE = {
  away_message: 'We are away.',
  weekly: { weekday_open: '10:00', weekday_close: '18:30', saturday_open: '10:00', saturday_close: '16:00' },
  holidays: [{ date: '2026-11-08', name: 'Diwali' }],
  closures: [{ name: 'an office event', start: '2026-10-30T17:00', end: '2026-10-31T00:00' }],
  callback_blackouts: [{ name: 'Office closure', start_date: '2026-11-07', end_date: '2026-11-15' }],
}

test('toForm -> toPayload round-trips what the API sent', () => {
  const form = toForm(SAMPLE)
  assert.deepEqual(toPayload(form), SAMPLE)
  assert.deepEqual(validate(form), [])
})

test('toForm survives a missing/empty response', () => {
  const form = toForm(undefined)
  assert.equal(form.weekly.weekday_close, '18:30')
  assert.deepEqual(form.holidays, [])
  assert.equal(form.away_message, '')
})

test('rows added but left blank are not sent and not validated', () => {
  const form = toForm(SAMPLE)
  form.holidays.push(emptyHoliday())
  form.closures.push(emptyClosure())
  form.callback_blackouts.push(emptyBlackout())
  assert.deepEqual(toPayload(form), SAMPLE)
  assert.deepEqual(validate(form), [])
  assert.equal(isDirty(form, toForm(SAMPLE)), false)
})

test('values are trimmed', () => {
  const form = toForm(SAMPLE)
  form.away_message = '  hello  '
  form.holidays[0].name = '  Diwali '
  const p = toPayload(form)
  assert.equal(p.away_message, 'hello')
  assert.equal(p.holidays[0].name, 'Diwali')
})

test('isDirty notices a real edit', () => {
  const form = toForm(SAMPLE)
  form.weekly.weekday_close = '19:00'
  assert.equal(isDirty(form, toForm(SAMPLE)), true)
})

test('opening must be before closing', () => {
  const form = toForm(SAMPLE)
  form.weekly.weekday_open = '19:00'
  form.weekly.saturday_close = '09:00'
  const errors = validate(form)
  assert.equal(errors.length, 2)
  assert.match(errors[0], /Mon–Fri/)
  assert.match(errors[1], /Saturday/)
})

test('closure needs a reason, both times, and end after start', () => {
  const form = toForm(SAMPLE)
  form.closures = [
    { name: '', start: '2026-12-01T10:00', end: '2026-12-01T11:00' },
    { name: 'x', start: '2026-12-01T10:00', end: '' },
    { name: 'y', start: '2026-12-02T10:00', end: '2026-12-02T09:00' },
  ]
  const errors = validate(form)
  assert.equal(errors.length, 3)
  assert.match(errors[0], /Closure 1: add a reason/)
  assert.match(errors[1], /Closure 2: set both/)
  assert.match(errors[2], /Closure 3: the end must be after/)
})

test('holidays: date + name required, no duplicates', () => {
  const form = toForm(SAMPLE)
  form.holidays = [
    { date: '2026-12-01', name: 'A' },
    { date: '2026-12-01', name: 'B' },
    { date: '', name: 'C' },
    { date: '2026-12-03', name: '' },
  ]
  const errors = validate(form)
  assert.ok(errors.some(e => /listed twice/.test(e)))
  assert.ok(errors.some(e => /Holiday 3: choose a date/.test(e)))
  assert.ok(errors.some(e => /Holiday 4: add a name/.test(e)))
})

test('no-callback dates: last date can not precede the first', () => {
  const form = toForm(SAMPLE)
  form.callback_blackouts = [{ name: '', start_date: '2026-11-10', end_date: '2026-11-09' }]
  assert.match(validate(form)[0], /can’t be before the first/)
  form.callback_blackouts = [{ name: '', start_date: '2026-11-10', end_date: '2026-11-10' }]
  assert.deepEqual(validate(form), [])
})

test('away message length limit matches the server (600)', () => {
  const form = toForm(SAMPLE)
  form.away_message = 'x'.repeat(600)
  assert.deepEqual(validate(form), [])
  form.away_message = 'x'.repeat(601)
  assert.match(validate(form)[0], /at most 600/)
})

test('isPast compares IST wall-clock strings', () => {
  assert.equal(isPast('2026-10-30', '2026-10-31T09:00'), true)
  assert.equal(isPast('2026-11-02', '2026-10-31T09:00'), false)
  assert.equal(isPast('2026-10-31', '2026-10-31T09:00'), false) // today is not past
  assert.equal(isPast('2026-10-30T17:00', '2026-10-30T18:00'), true)
  assert.equal(isPast('2026-10-30T18:00', '2026-10-30T17:00'), false)
  assert.equal(isPast('', '2026-10-31T09:00'), false)
})

test('prettyWhen', () => {
  assert.equal(prettyWhen('2026-11-07T12:00'), '7 Nov 2026, 12:00 PM')
  assert.equal(prettyWhen('2026-10-30T00:05'), '30 Oct 2026, 12:05 AM')
  assert.equal(prettyWhen('2026-11-15'), '15 Nov 2026')
  assert.equal(prettyWhen(''), '')
})
