import { useState, useEffect } from 'react';

export function useDebounce(val: string, delay: number) {
  const [debounceValue, setDebounceValue] = useState(val);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceValue(val);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [val, delay]);
  return debounceValue;
}
