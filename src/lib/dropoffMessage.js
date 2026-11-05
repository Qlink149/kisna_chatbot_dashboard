// Drop-off message page: the same cleaning and checks the server makes
// (kisna_chatbot/utils/dropoff_settings.py) so mistakes show up before Save.
// Only the wording around the offers is editable; the offers come from the bot.

export const cleanText = text => (text || '').replace(/\r\n?/g, '\n').trim()

export const isDirty = (form, saved) =>
  cleanText(form.header) !== cleanText(saved.header) || cleanText(form.footer) !== cleanText(saved.footer)

// A list of plain-English problems; empty means "safe to save". An empty box is
// allowed: it goes back to the standard wording.
export function validate(form, maxChars) {
  const tooLong = (text, label) =>
    cleanText(text).length > maxChars
      ? [`The ${label} is too long (${cleanText(text).length.toLocaleString('en-IN')} characters, the limit is ${maxChars.toLocaleString('en-IN')}).`]
      : []
  return [...tooLong(form.header, 'top text'), ...tooLong(form.footer, 'bottom text')]
}

// What the customer receives, for the empty-box case: an empty box sends the
// standard wording, so the preview must not pretend otherwise.
export const toPayload = form => ({ header: cleanText(form.header), footer: cleanText(form.footer) })
