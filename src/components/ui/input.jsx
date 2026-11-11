import { cn } from '@/lib/utils'

// Text fields: Formula-like text starting with =, +, -, or @ is not allowed.
// Number-like values (-5, +5, 12.5) are always valid.
const BLOCKED_START = /^[=+\-@\t\r]/
const NUMBER_LIKE = /^[+-]?(\d+\.?\d*|\.\d*)?$/

function Input({ className, type, onChange, allowSpecial = false, ...props }) {
    // type na diya ho to browser use text samajhta hai
  const isTextType = !type || type === 'text' || type === 'search'

  function handleChange(event) {
    if (isTextType && !allowSpecial) {
      const value = event.target.value
      if (BLOCKED_START.test(value) && !NUMBER_LIKE.test(value.trim())) {
        // Parent ke onChange se pehle saaf kar do
        event.target.value = value.replace(/^[=+\-@\t\r]+/, '')
      }
    }
    onChange?.(event)
  }
  return (
    
    <input
        
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
      onChange={handleChange}
    />
  )
}

export { Input }
