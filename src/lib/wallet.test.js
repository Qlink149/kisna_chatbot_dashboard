// node --test src/lib/wallet.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dailyBars,
  debounce,
  durationText,
  formatDay,
  formatIST,
  formatRupees,
  modeLabel,
  relativeTime,
  runwayText,
  statusTotal,
  topupProblem,
  unconfirmedCount,
  walletStatusLabel,
} from './wallet.js'

test('formatRupees uses Indian grouping and two decimals', () => {
  assert.equal(formatRupees('3.5'), '₹3.50')
  assert.equal(formatRupees('100000'), '₹1,00,000.00')
  assert.equal(formatRupees('9488.50'), '₹9,488.50')
  assert.equal(formatRupees(null), '—')
  assert.equal(formatRupees('abc'), '—')
})

test('formatIST shows the time in India, whatever the machine timezone', () => {
  // 2026-11-11 09:30 UTC = 3:00 pm IST
  const t = Date.UTC(2026, 10, 11, 9, 30) / 1000
  assert.match(formatIST(t), /11 Nov/)
  assert.match(formatIST(t), /3:00\s?pm/i)
  assert.equal(formatIST(null), '—')
})

test('formatDay reads the date as a calendar day', () => {
  assert.equal(formatDay('2026-11-01'), '1 Nov')
})

test('durationText and relativeTime', () => {
  assert.equal(durationText(30), '30s')
  assert.equal(durationText(600), '10m')
  assert.equal(durationText(3 * 3600 + 5 * 60), '3h 5m')
  assert.equal(durationText(2 * 86400 + 4 * 3600), '2d 4h')
  const now = 1_800_000_000_000
  assert.equal(relativeTime(now / 1000 - 10, now), 'just now')
  assert.equal(relativeTime(now / 1000 - 300, now), '5m ago')
  assert.equal(relativeTime(null, now), '')
})

test('runwayText', () => {
  assert.equal(runwayText(null), 'Not enough data yet')
  assert.equal(runwayText(0.4), 'Under a day left')
  assert.equal(runwayText(7.74), 'About 7.7 days left')
  assert.equal(runwayText(1), 'About 1 day left')
  assert.equal(runwayText(42.6), 'About 43 days left')
})

test('labels for mode and wallet status', () => {
  assert.equal(modeLabel('shadow'), 'Shadow — counting only, never charged')
  assert.equal(modeLabel('live'), 'Live')
  assert.equal(modeLabel(undefined), 'Unknown')
  assert.equal(walletStatusLabel('PAUSED'), 'Paused')
  assert.equal(walletStatusLabel(null), 'Unknown')
})

test('status counts', () => {
  const by = { SHADOW: 5, PENDING: 2, CHARGED: 10, REJECTED: 1, STUCK: 3 }
  assert.equal(unconfirmedCount(by), 5)
  assert.equal(statusTotal(by), 21)
  assert.equal(unconfirmedCount(undefined), 0)
})

test('topupProblem enforces ₹100 to ₹1,00,000', () => {
  assert.equal(topupProblem('100'), '')
  assert.equal(topupProblem('100000'), '')
  assert.equal(topupProblem('250.50'), '')
  assert.match(topupProblem('99'), /smallest/)
  assert.match(topupProblem('100001'), /largest/)
  assert.match(topupProblem(''), /Enter/)
  assert.match(topupProblem('1e3'), /rupees/)
  assert.match(topupProblem('10.123'), /rupees/)
})

test('dailyBars scales to the busiest day and splits charged / shadow', () => {
  const bars = dailyBars([
    { date: '2026-11-10', bundles: 4, amount_rupees: '14.00', charged: 3, shadow: 1 },
    { date: '2026-11-11', bundles: 2, amount_rupees: '7.00', charged: 0, shadow: 0 },
    { date: '2026-11-12', bundles: 0, amount_rupees: '0.00', charged: 0, shadow: 0 },
  ])
  assert.equal(bars[0].chargedPct, 75)
  assert.equal(bars[0].shadowPct, 25)
  assert.equal(bars[0].otherPct, 0)
  assert.equal(bars[1].otherPct, 50)
  assert.equal(bars[2].chargedPct + bars[2].shadowPct + bars[2].otherPct, 0)
  assert.deepEqual(dailyBars(null), [])
})

test('debounce only fires the last call', async () => {
  const calls = []
  const fn = debounce(v => calls.push(v), 20)
  fn(1); fn(2); fn(3)
  await new Promise(r => setTimeout(r, 50))
  assert.deepEqual(calls, [3])
  fn(4); fn.cancel()
  await new Promise(r => setTimeout(r, 50))
  assert.deepEqual(calls, [3])
})
