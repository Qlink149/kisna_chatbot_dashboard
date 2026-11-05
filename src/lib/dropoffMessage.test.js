// node --test src/lib/dropoffMessage.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanText, isDirty, toPayload, validate } from './dropoffMessage.js'

const saved = { header: 'top', footer: 'bottom' }

test('cleanText trims the ends and normalises line endings, keeping the text', () => {
  assert.equal(cleanText('  a\r\n\r\nb 💎 \n'), 'a\n\nb 💎')
  assert.equal(cleanText(null), '')
})

test('isDirty looks at both boxes and ignores whitespace at the ends', () => {
  assert.equal(isDirty({ header: ' top\n', footer: 'bottom ' }, saved), false)
  assert.equal(isDirty({ header: 'top!', footer: 'bottom' }, saved), true)
  assert.equal(isDirty({ header: 'top', footer: '' }, saved), true)
})

test('validate allows empty boxes, which go back to the standard wording', () => {
  assert.deepEqual(validate({ header: '', footer: '' }, 10), [])
})

test('validate allows exactly the limit and names the box that is too long', () => {
  assert.deepEqual(validate({ header: 'x'.repeat(10), footer: '' }, 10), [])
  const problems = validate({ header: '', footer: 'x'.repeat(11) }, 10)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /bottom text/)
})

test('toPayload only ever sends the two editable boxes', () => {
  assert.deepEqual(toPayload({ header: ' a ', footer: 'b', offers: 'Up to 99% OFF' }), { header: 'a', footer: 'b' })
})
