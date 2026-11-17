import { cn } from '@/lib/utils'

function Input({ className, type, name, id, onChange, onKeyDown, ...props }) {
  // Is it a normal text box or a number box?
  const isText = !type || type === 'text'
  const isNumber = type === 'number'

 // Name field = name/id has "name" (but not "username")
  const label = `${name || ''} ${id || ''}`.toLowerCase()
  const isNameField = isText && label.includes('name') && !label.includes('user')

  function handleChange(event) {
    const value = event.target.value

    if (isNameField) {
      // Name field: keep only letters and spaces
      event.target.value = value.replace(/[^\p{L}\s]/gu, '')
    } else if (isText) {
      // Other text fields: remove leading = + - @
      event.target.value = value.replace(/^[=+\-@]+/, '')
    }

    onChange?.(event)
  }

  function handleKeyDown(event) {
    // Number field: block e, E, + and -
    if (isNumber && ['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault()
    }
    onKeyDown?.(event)
  }

  return (
    <input
      type={type}
      name={name}
      id={id}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  )
}

export { Input }