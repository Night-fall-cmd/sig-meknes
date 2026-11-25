import { useState, useEffect } from "react";
export function useStorage(key, initial, valid = Array.isArray) {
  const [value, setValue] = useState(() => {
      try {
        const raw = JSON.parse(localStorage.getItem(key));
        return valid(raw) ? raw : initial;
      } catch {
        return initial;
      }
    }),
    [error, setError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(false);
    } catch {
      setError(true);
    }
  }, [key, value]);
  return [value, setValue, error];
}
