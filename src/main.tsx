import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import type { Hass, PanelProps } from './ha/types';

/**
 * Entry point. Home Assistant loads a custom panel as an ES module and expects
 * it to define a custom element, which HA then instantiates and sets
 * properties on (`hass`, `narrow`, `route`, `panel`).
 *
 * So the outermost layer is a web component; React lives inside it. Note the
 * element does NOT use shadow DOM — staying in the light DOM lets HA's theme
 * CSS custom properties (--primary-text-color and friends) cascade in, which
 * is what keeps a React panel looking native and theme-aware.
 */
class ReactHomeAssistantPanel extends HTMLElement {
  private root: Root | null = null;
  private props: Partial<PanelProps> = {};

  set hass(value: Hass) {
    this.props.hass = value;
    this.render();
  }

  set narrow(value: boolean) {
    this.props.narrow = value;
    this.render();
  }

  set route(value: PanelProps['route']) {
    this.props.route = value;
  }

  set panel(value: PanelProps['panel']) {
    this.props.panel = value;
    this.render();
  }

  connectedCallback() {
    if (!this.root) this.root = createRoot(this);
    this.render();
  }

  disconnectedCallback() {
    // Defer: HA moves panels around during navigation, and unmounting
    // synchronously inside the callback trips React's "unmount during render".
    const root = this.root;
    this.root = null;
    queueMicrotask(() => root?.unmount());
  }

  private render() {
    if (!this.root || !this.props.hass) return;
    this.root.render(
      <App
        hass={this.props.hass}
        narrow={this.props.narrow ?? false}
        route={this.props.route}
        panel={this.props.panel}
      />
    );
  }
}

if (!customElements.get('react-for-home-assistant')) {
  customElements.define('react-for-home-assistant', ReactHomeAssistantPanel);
}
