import { useState, useEffect } from 'react';

/**
 * Debounce any changing value. The latest value is returned
 * only after the user stops updating it for `delay` ms.
 */
export default function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}