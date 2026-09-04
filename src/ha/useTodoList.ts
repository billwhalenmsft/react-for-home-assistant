import { useCallback, useEffect, useState } from 'react';
import { useEntity } from './useEntities';
import type { Hass } from './types';

export interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  description?: string;
}

interface GetItemsResponse {
  response?: Record<string, { items?: TodoItem[] }>;
}

/**
 * Read/write a Home Assistant `todo` list.
 *
 * Deliberately NOT `useUserData`: that stores against the logged-in HA user, so
 * a shared family list would give every person their own private checkmarks.
 * A `todo` entity is one list the whole household sees, and it stays editable
 * from HA's own To-do panel and the companion app rather than only from here.
 *
 * Items arrive through `todo.get_items`, which is a service call with a
 * response rather than entity state - the entity itself only carries a count.
 * That count is the useful part: it changes whenever anything is checked off,
 * including from another device, so it doubles as the refetch trigger and
 * saves us a subscription.
 */
export function useTodoList(hass: Hass, entityId: string) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const entity = useEntity(hass, entityId);
  const remaining = entity?.state;

  const fetchItems = useCallback(() => {
    if (!entityId) return;
    hass.connection
      .sendMessagePromise<GetItemsResponse>({
        type: 'call_service',
        domain: 'todo',
        service: 'get_items',
        target: { entity_id: entityId },
        return_response: true,
      })
      .then((res) => {
        const list = res?.response?.[entityId]?.items ?? [];
        setItems(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [hass, entityId]);

  // `remaining` in the deps is the cross-device refresh: check something off on
  // a phone and the count moves, which re-runs this.
  useEffect(fetchItems, [fetchItems, remaining]);

  const setStatus = useCallback(
    (item: TodoItem, done: boolean) => {
      const next = done ? 'completed' : 'needs_action';
      // Optimistic: the round trip plus the state-change refetch is slow enough
      // to feel like a dropped tap on a wall tablet.
      setItems((prev) =>
        prev.map((i) => (i.uid === item.uid ? { ...i, status: next } : i))
      );
      void hass
        .callService('todo', 'update_item', { item: item.uid, status: next }, { entity_id: entityId })
        .catch(fetchItems);
    },
    [hass, entityId, fetchItems]
  );

  const addItem = useCallback(
    (summary: string, description?: string) => {
      const text = summary.trim();
      if (!text) return;
      void hass
        .callService(
          'todo',
          'add_item',
          description ? { item: text, description } : { item: text },
          { entity_id: entityId }
        )
        .then(fetchItems)
        .catch(fetchItems);
    },
    [hass, entityId, fetchItems]
  );

  return { items, loaded, setStatus, addItem, refresh: fetchItems };
}
