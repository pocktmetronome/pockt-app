import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_DISPLAY_PREFS, type DisplayPrefs } from '@/constants/display';
import { loadDisplayPrefs, saveDisplayPrefs } from '@/storage/display-prefs';

export function useDisplayPrefs() {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULT_DISPLAY_PREFS);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDisplayPrefs().then((saved) => {
      if (alive) setPrefs(saved);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDisplayPrefs(prefs);
    }, 160);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<DisplayPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs((prev) => ({
      ...DEFAULT_DISPLAY_PREFS,
      curtainHintSeen: prev.curtainHintSeen,
      privacyHintSeen: prev.privacyHintSeen,
    }));
  }, []);

  return { prefs, updatePrefs, resetPrefs };
}
