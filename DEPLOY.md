# Deploying the Estate build

Build output: `dist/react-for-home-assistant.js` (v2 "Whalen Estate" — built + DOM-QA'd 2026-08-17 night)

The desktop session cannot write `www/` on the share (container-owned). To ship:

1. Copy `dist/react-for-home-assistant.js` → `/share/NAS/shared/homeassistant/config/www/yard/react-home.js`
   (via SSH; or any session with write access to www/yard)
2. Bump the Lovelace resource so browsers drop the cached v5:
   WS `lovelace/resources/update` → the item whose url starts `/local/yard/react-home.js` → set url `/local/yard/react-home.js?v=6`
3. Hard-refresh http://192.168.6.5:8123/home-automation-react/hub

Rollback: `git checkout cc2a9ba -- src/ && npm run build` then redo 1–2 (v=7).

Visual QA harness (no HA login needed): `node` the inline server from the session notes, or
open harness.html over any static server — it mocks `hass` from harness-states.js.
Note: mock connection needs `haVersion` — hass-js-ws feature-gates on it.
