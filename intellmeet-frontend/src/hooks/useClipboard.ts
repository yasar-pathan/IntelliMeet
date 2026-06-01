import { useState, useCallback } from 'react';

/**
 * Copy text to clipboard with success state.
 */
export function useClipboard(timeout = 2000) {
  const [hasCopied, setHasCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), timeout);
      } catch (err) {
        console.error('Failed to copy:', err);
        setHasCopied(false);
      }
    },
    [timeout]
  );

  return { copy, hasCopied };
}
