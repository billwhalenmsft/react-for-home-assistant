import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { subscribeEntities } from 'home-assistant-js-websocket';
import type { Hass, HassEntity } from './types';

/**
 * Selective entity subscription.
 *
 * THE performance rule for React inside Home Assistant: `hass` is replaced on
 * every state change, and a busy house emits hundreds a minute (a weather
 * station alone will do it). Passing `hass` down as a prop re-renders the whole
 * tree constantly and will cook a wall tablet.
 *
 * Instead we subscribe ONCE per connection, keep the entity map in a module
 * store, and let each component select only the entities it named. A component
 * re-renders when *its* entities change and at no other time.
 */

type EntityMap = Record<string, HassEntity>;
type Listener = () => void;

interface Store {
  entities: EntityMap;
  listeners: Set<Listener>;
  unsub?: () => void;
}

const stores = new WeakMap<object, Store>();

function storeFor(hass: Hass): Store {
  let store = stores.get(hass.connection as unknown as object);
  if (store) return store;

  store = { entities: {}, listeners: new Set() };
  stores.set(hass.connection as unknown as object, store);

  store.unsub = subscribeEntities(hass.connection, (entities) => {
    store!.entities = entities as EntityMap;
    store!.listeners.forEach((l) => l());
  });

  return store;
}

/**
 * Subscribe to a fixed list of entity ids.
 *
 * Returns a snapshot object keyed by entity id. The snapshot's identity only
 * changes when one of the requested entities actually changes, so it is safe
 * to use directly in deps arrays and memo comparisons.
 */
export function useEntities(hass: Hass, ids: readonly string[]): EntityMap {
  const store = storeFor(hass);

  // stable key so callers can pass an inline array literal without thrashing
  const key = useMemo(() => [...ids].sort().join('|'), [ids]);
  const snapshot = useRef<{ key: string; value: EntityMap }>({ key: '', value: {} });

  const subscribe = useCallback(
    (onChange: Listener) => {
      store.listeners.add(onChange);
      return () => store.listeners.delete(onChange);
    },
    [store]
  );

  const getSnapshot = useCallback((): EntityMap => {
    const next: EntityMap = {};
    for (const id of key ? key.split('|') : []) {
      const e = store.entities[id];
      if (e) next[id] = e;
    }

    // Only hand back a new object when something we care about moved.
    const prev = snapshot.current;
    if (prev.key === key) {
      const prevIds = Object.keys(prev.value);
      const nextIds = Object.keys(next);
      const same =
        prevIds.length === nextIds.length &&
        nextIds.every((id) => {
          const a = prev.value[id];
          const b = next[id];
          return a && b && a.state === b.state && a.last_updated === b.last_updated;
        });
      if (same) return prev.value;
    }

    snapshot.current = { key, value: next };
    return next;
  }, [store, key]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Convenience for the single-entity case. */
export function useEntity(hass: Hass, id: string): HassEntity | undefined {
  const ids = useMemo(() => [id], [id]);
  return useEntities(hass, ids)[id];
}
