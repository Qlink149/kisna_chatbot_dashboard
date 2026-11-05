// node --test src/lib/dropoffMessage.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanMessage, isDirty, validate } from './dropoffMessage.js'

test('cleanMessage trims the ends and normalises line endings, keeping the text', () => {
  assert.equal(cleanMessage('  a\r\n\r\nb 💎 \n'), 'a\n\nb 💎')
  assert.equal(cleanMessage(null), '')
})

test('isDirty ignores whitespace at the ends only', () => {
  assert.equal(isDirty(' hello\n', 'hello'), false)
  assert.equal(isDirty('hello!', 'hello'), true)
  assert.equal(isDirty('', 'hello'), true)
})

test('validate allows empty, which goes back to automatic', () => {
  assert.deepEqual(validate('', 10), [])
})

test('validate allows exactly the limit and rejects one more', () => {
  assert.deepEqual(validate('x'.repeat(10), 10), [])
  assert.equal(validate('x'.repeat(11), 10).length, 1)
})
