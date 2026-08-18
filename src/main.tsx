import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { App } from './App';
import { HomeAutomation } from './home/HomeAutomation';
import type { Hass, PanelProps } from './ha/types';

/**
 * Entry point. Two custom elements are registered from one bundle:
 *
 *   <react-for-home-assistant>  a full-page PANEL, wired up via panel_custom in
 *                               configuration.yaml (needs a restart)
 *   <react-home-card>           a Lovelace CARD, loaded as a dashboard resource
 *                               (no restart — this is how it gets onto a
 *                               dashboard alongside the existing ones)
 *
 * Neither uses shadow DOM. Staying in the light DOM lets HA's theme custom
 * properties (--primary-text-color and friends) cascade in, which keeps a React
 * surface looking native and following whatever theme the view is set to
 * instead of shipping a second design system that drifts.
 */

abstract class ReactHost extends HTMLElement {
  protected root: Root | null = null;
  protected hassValue: Hass | null = null;

  set hass(value: Hass) {
    this.hassValue = value;
    this.render();
  }

  get hass(): Hass | null {
    return this.hassValue;
  }

  connectedCallback() {
    if (!this.root) this.root = createRoot(this);
    this.render();
  }

  disconnectedCallback() {
    // Defer: HA moves elements around during navigation, and unmounting
    // synchronously inside the callback trips React's "unmount during render".
    const root = this.root;
    this.root = null;
    queueMicrotask(() => root?.unmount());
  }

  protected abstract view(hass: Hass): ReactNode;

  protected render() {
    if (!this.root || !this.hassValue) return;
    this.root.render(this.view(this.hassValue));
  }
}

/* ---------------------------------------------------------------- panel -- */

class ReactHomeAssistantPanel extends ReactHost {
  private extra: Partial<PanelProps> = {};

  set narrow(value: boolean) {
    this.extra.narrow = value;
    this.render();
  }

  set route(value: PanelProps['route']) {
    this.extra.route = value;
  }

  set panel(value: PanelProps['panel']) {
    this.extra.panel = value;
    this.render();
  }

  protected view(hass: Hass): ReactNode {
    return (
      <App
        hass={hass}
        narrow={this.extra.narrow ?? false}
        route={this.extra.route}
        panel={this.extra.panel}
      />
    );
  }
}

/* ----------------------------------------------------------------- card -- */

interface CardConfig {
  type: string;
  /** which React surface to render; only "home" exists so far */
  view?: 'home';
}

class ReactHomeCard extends ReactHost {
  private config: CardConfig = { type: 'custom:react-home-card' };

  /** Lovelace calls this once with the card's config. */
  setConfig(config: CardConfig) {
    this.config = config;
    this.render();
  }

  /** Rough height in ~50 px units, used by Lovelace's masonry layout. */
  getCardSize() {
    return 24;
  }

  static getStubConfig(): CardConfig {
    return { type: 'custom:react-home-card', view: 'home' };
  }

  protected view(hass: Hass): ReactNode {
    void this.config;
    return <HomeAutomation hass={hass} />;
  }
}

/* ------------------------------------------------------------- register -- */

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
  }
}

if (!customElements.get('react-for-home-assistant')) {
  customElements.define('react-for-home-assistant', ReactHomeAssistantPanel);
}

if (!customElements.get('react-home-card')) {
  customElements.define('react-home-card', ReactHomeCard);

  // Makes the card show up in Lovelace's "Add card" picker.
  window.customCards = window.customCards ?? [];
  window.customCards.push({
    type: 'react-home-card',
    name: 'React Home',
    description: 'Home Automation rendered in React — fluid layout, phone/tablet/desktop modes.',
    preview: false,
  });
}

console.info(
  '%c REACT-FOR-HOME-ASSISTANT %c panel + card registered ',
  'color:#0c1418;background:#37b6c4;font-weight:700',
  'color:#37b6c4;background:#0c1418'
);
