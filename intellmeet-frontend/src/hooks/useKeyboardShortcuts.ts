import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
}

/**
 * Register global keyboard shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target.isContentEditable) return;

      for (const shortcut of shortcuts) {
        const metaOrCtrl = shortcut.meta || shortcut.ctrl;
        const isMetaMatch = metaOrCtrl
          ? event.metaKey || event.ctrlKey
          : !event.metaKey && !event.ctrlKey;
        const isShiftMatch = shortcut.shift
          ? event.shiftKey
          : !event.shiftKey;
        const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (isMetaMatch && isShiftMatch && isKeyMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
