import { useCallback, useEffect, useState } from 'react';
import type { Hass } from './types';

/**
 * Per-user persistence, server-side.
 *
 * Home Assistant's `frontend/get_user_data` / `set_user_data` store a blob
 * against the *logged-in HA user*, which is exactly the semantics we want for
 * personal settings: Bill's favorites and Erin's favorites are different lists
 * on the same dashboard, and they follow each person to any device they sign
 * in on.
 *
 * Deliberately not localStorage (per-browser, not per-person, and lost on a
 * wall tablet reset) and not helper entities (one input_text per user per
 * setting turns into entity sprawl fast).
 *
 * Returns [value, save, loaded]. `loaded` matters: until the round trip
 * finishes, `value` is the fallback, and writing then would persist the
 * fallback over whatever the user actually had.
 */
export function useUserData<T>(hass: Hass, key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hass.connection
      .sendMessagePromise<{ value: T | null }>({ type: 'frontend/get_user_data', key })
      .then((res) => {
        if (cancelled) return;
        if (res && res.value != null) setValue(res.value);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      void hass.connection.sendMessagePromise({
        type: 'frontend/set_user_data', key, value: next,
      });
    },
    [hass, key]
  );

  return [value, save, loaded] as const;
}
