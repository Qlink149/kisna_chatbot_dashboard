import { useEffect, useState } from 'react'

// The value, but only once it has stopped changing for `ms`.
export function useDebouncedValue(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
