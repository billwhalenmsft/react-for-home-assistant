import type { Connection, HassEntity } from 'home-assistant-js-websocket';

/**
 * The subset of Home Assistant's `hass` object this project relies on.
 *
 * HA hands the full object to a custom panel as a property. It is large and
 * changes identity on *every* state update, which is why nothing here should
 * ever hold onto it as React state — see ha/useEntities.ts.
 */
export interface Hass {
  states: Record<string, HassEntity>;
  connection: Connection;
  themes: unknown;
  language: string;
  user?: { name: string; is_admin: boolean };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown>;
}

/** Properties HA sets on the panel element. */
export interface PanelProps {
  hass: Hass;
  narrow: boolean;
  route?: { prefix: string; path: string };
  panel?: { config?: Record<string, unknown> };
}

export type { HassEntity };
