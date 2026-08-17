import { useEffect, useRef } from 'react';
import type { Hass } from './types';

/**
 * Render ANY Home Assistant card — built-in or HACS-installed — inside React.
 *
 * This is the whole reason "standard + custom together" is achievable rather
 * than a rewrite: HA's frontend is Lit, and Lit components are plain custom
 * elements. Custom elements are framework-agnostic, so React can host them.
 * A `tile` card, a `mushroom-template-card` and a bespoke React component can
 * sit in the same layout with no bridge layer.
 *
 * CAVEAT, and it is the real maintenance cost of this project:
 * `window.loadCardHelpers()` is NOT public API. It exists because HA's own
 * frontend uses it, and it can change between releases. Everything that
 * touches it is deliberately confined to this file so a breaking change is a
 * one-file fix rather than a hunt.
 */

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{
      createCardElement(config: Record<string, unknown>): HTMLElement & { hass?: Hass };
    }>;
  }
}

export interface HaCardProps {
  hass: Hass;
  /** Any Lovelace card config, e.g. { type: 'tile', entity: 'light.kitchen' } */
  config: Record<string, unknown>;
}

export function HaCard({ hass, config }: HaCardProps) {
  const host = useRef<HTMLDivElement>(null);
  const el = useRef<(HTMLElement & { hass?: Hass }) | null>(null);
  const configKey = JSON.stringify(config);

  // (re)build the card element whenever its config changes
  useEffect(() => {
    let cancelled = false;
    const mount = host.current;
    if (!mount) return;

    (async () => {
      if (!window.loadCardHelpers) {
        mount.textContent = 'Card helpers unavailable — is this running inside Home Assistant?';
        return;
      }
      const helpers = await window.loadCardHelpers();
      if (cancelled) return;

      const card = helpers.createCardElement(JSON.parse(configKey));
      card.hass = hass;
      mount.replaceChildren(card);
      el.current = card;
    })();

    return () => {
      cancelled = true;
      mount.replaceChildren();
      el.current = null;
    };
    // hass intentionally omitted: it is pushed separately below, and including
    // it here would tear down and rebuild the card on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  // push hass through on every render without remounting the element
  useEffect(() => {
    if (el.current) el.current.hass = hass;
  }, [hass]);

  return <div ref={host} />;
}
