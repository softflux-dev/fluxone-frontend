//for inputfields
const BLOCKED_START = /^[=+\-@\t\r]/
const NUMBER_LIKE = /^[+-]?(\d+\.?\d*|\.\d*)?$/

function isPlainTextField(el) {
  if (el instanceof HTMLTextAreaElement) return true
  if (!(el instanceof HTMLInputElement)) return false
  return el.type === 'text' || el.type === 'search'
}

function handleInput(event) {
  const el = event.target
  if (!isPlainTextField(el)) return
  if (el.dataset.allowSpecial === 'true') return
  if (['numeric', 'decimal', 'tel'].includes(el.inputMode)) return

  const value = el.value
  if (!BLOCKED_START.test(value)) return
  if (NUMBER_LIKE.test(value.trim())) return

  const cleaned = value.replace(/^[=+\-@\t\r]+/, '')
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, cleaned)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

document.addEventListener('input', handleInput, true)