// Drop-off message page: the same cleaning and checks the server makes
// (kisna_chatbot/utils/dropoff_settings.py) so mistakes show up before Save.

export const cleanMessage = text => (text || '').replace(/\r\n?/g, '\n').trim()

export const isDirty = (text, saved) => cleanMessage(text) !== cleanMessage(saved)

// A list of plain-English problems; empty means "safe to save". An empty box is
// allowed: it goes back to the automatic message.
export function validate(text, maxChars) {
  const length = cleanMessage(text).length
  return length > maxChars
    ? [`The message is too long (${length.toLocaleString('en-IN')} characters, the limit is ${maxChars.toLocaleString('en-IN')}).`]
    : []
}
