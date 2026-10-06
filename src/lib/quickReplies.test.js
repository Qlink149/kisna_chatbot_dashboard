// node --test src/lib/quickReplies.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { fillName, filterReplies, firstNameFrom, insertAt, previewOf, replaceSlash, slashQuery } from './quickReplies.js'

test('firstNameFrom follows the bot greeting rule', () => {
  assert.equal(firstNameFrom('RAJENDRA singh'), 'Rajendra')
  assert.equal(firstNameFrom('  priya  '), 'Priya')
  assert.equal(firstNameFrom('प्रिया शर्मा'), 'प्रिया')
  assert.equal(firstNameFrom('9876543210'), null)
  assert.equal(firstNameFrom('R.K.'), null)
  assert.equal(firstNameFrom('customer'), null)
  assert.equal(firstNameFrom('a'.repeat(21)), null)
  assert.equal(firstNameFrom(''), null)
  assert.equal(firstNameFrom(null), null)
})

test('fillName puts the name in', () => {
  assert.equal(fillName('Hi {name}, thanks for waiting.', 'Priya'), 'Hi Priya, thanks for waiting.')
  assert.equal(fillName('{name}! {Name}?', 'Priya'), 'Priya! Priya?')
  assert.equal(fillName('No placeholder', 'Priya'), 'No placeholder')
})

test('fillName removes the placeholder cleanly without a name', () => {
  const cases = [
    ['Hi {name}, thanks for waiting.', 'Hi, thanks for waiting.'],
    ['Hello {name}!', 'Hello!'],
    ['Thank you, {name}.', 'Thank you.'],
    ['Hi, {name}, your order is ready.', 'Hi, your order is ready.'],
    ['{name}, your order is ready.', 'Your order is ready.'],
    ['{name} your order is ready.', 'Your order is ready.'],
    ['Dear {name}\nYour order is ready.', 'Dear\nYour order is ready.'],
    ['Hi { name }, ok', 'Hi, ok'],
  ]
  for (const [body, want] of cases) assert.equal(fillName(body, null), want, body)
})

test('previewOf is one line', () => {
  assert.equal(previewOf('Hi {name},\n\nline two', 'Priya'), 'Hi Priya, line two')
})

test('filterReplies matches title or body, every word, case-insensitive, keeps order', () => {
  const list = [
    { title: 'Store hours', body: 'Open 10:30 AM to 8 PM' },
    { title: 'Delivery time', body: 'Usually 7 working days' },
    { title: 'Return policy', body: '15-day returns at any store' },
  ]
  assert.deepEqual(filterReplies(list, '').map(r => r.title), ['Store hours', 'Delivery time', 'Return policy'])
  assert.deepEqual(filterReplies(list, 'STORE').map(r => r.title), ['Store hours', 'Return policy'])
  assert.deepEqual(filterReplies(list, 'del days').map(r => r.title), ['Delivery time'])
  assert.deepEqual(filterReplies(list, 'zzz'), [])
})

test('slashQuery only at the start of the box', () => {
  assert.equal(slashQuery('/sto'), 'sto')
  assert.equal(slashQuery('/'), '')
  assert.equal(slashQuery('/del\nmore'), 'del')
  assert.equal(slashQuery('hi /sto'), null)
  assert.equal(slashQuery(''), null)
})

test('insertAt replaces an empty box, otherwise inserts at the cursor', () => {
  assert.deepEqual(insertAt('', 'Hello', 0, 0), { value: 'Hello', caret: 5 })
  assert.deepEqual(insertAt('   ', 'Hello', 3, 3), { value: 'Hello', caret: 5 })
  assert.deepEqual(insertAt('Hi . Bye', 'there', 3, 3), { value: 'Hi there. Bye', caret: 8 })
  assert.deepEqual(insertAt('Hi XX', 'you', 3, 5), { value: 'Hi you', caret: 6 })
  assert.deepEqual(insertAt('Hi', ' you', undefined, undefined), { value: 'Hi you', caret: 6 })
})

test('replaceSlash swaps the /query line and keeps the rest', () => {
  assert.deepEqual(replaceSlash('/sto', 'Open 10:30'), { value: 'Open 10:30', caret: 10 })
  assert.deepEqual(replaceSlash('/sto\nP.S.', 'Open'), { value: 'Open\nP.S.', caret: 4 })
})
