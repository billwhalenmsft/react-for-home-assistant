# React for Home Assistant

Build Home Assistant dashboards with React — **standard Lovelace cards and
custom React components side by side, in the same layout, sharing one
connection.**

Lovelace is a good card model. It is a less good *application* model: if you
want a genuine 3D floorplan, a bespoke scheduling UI, or a view with real
client-side state, you end up fighting the card contract. This project is the
other option — a full React app inside HA that can still render every card you
already have, including HACS ones.

Think of the split the way Power Platform does it: standard components for the
90% you shouldn't hand-build, custom code for the 10% that makes it yours.

> **Status: early scaffold.** The plumbing works — panel registration, selective
> entity subscription, and hosting arbitrary HA cards inside React. There is no
> layout editor or component registry yet. See [Roadmap](#roadmap).

## Why this can work at all

Home Assistant's frontend is Lit, and Lit components are plain **custom
elements**. Custom elements are framework-agnostic, so React can host them
directly:

```tsx
<HaCard hass={hass} config={{ type: 'tile', entity: 'light.kitchen' }} />
<EntityTile hass={hass} entity="light.kitchen" />
```

Both render in the same grid. The first is HA's own card; the second is plain
React. No bridge, no iframe, no reimplementation of the card ecosystem.

## The two things that will bite you

Neither is a reason not to do this, but both should shape the design from day
one rather than be discovered later.

**1. `hass` changes identity on every state update.** A busy house emits
hundreds a minute — a weather station alone will do it. Passing `hass` down as
a prop re-renders the entire tree constantly and will cook a wall tablet.

`src/ha/useEntities.ts` solves this: subscribe **once** per connection, keep
entities in a module store, and let each component select only what it named.

```tsx
// re-renders when the lock changes, and at no other time
const lock = useEntity(hass, 'lock.front_door');
```

**2. `loadCardHelpers()` is not public API.** It exists because HA's own
frontend uses it, and it can change between releases. All of it is confined to
`src/ha/HaCard.tsx`, so a breaking change is a one-file fix rather than a hunt.

## Install

**Via HACS** (once published): add this repo as a custom repository of type
*Lovelace*, install, then register the panel below.

**Manually:** copy `dist/react-for-home-assistant.js` into `<config>/www/`.

Then in `configuration.yaml`:

```yaml
panel_custom:
  - name: react-for-home-assistant
    url_path: react-ha
    module_url: /local/react-for-home-assistant.js
    sidebar_title: React
    sidebar_icon: mdi:react
    config:
      entities:
        - light.kitchen_all_lights
        - lock.front_door
```

Restart HA. "React" appears in the sidebar.

## Develop

```bash
npm install
npm run build      # type-check, then bundle to dist/
npm run dev        # rebuild on change
```

Bundle is ~179 kB gzipped — React and the websocket client are bundled in,
because a panel has to be self-contained.

Point `module_url` at a dev copy in `www/` and hard-refresh to iterate. HA
caches panel modules aggressively; append `?v=2` while developing.

## Architecture

| File | Role |
|---|---|
| `src/main.tsx` | Defines the custom element HA instantiates; mounts React inside it |
| `src/ha/types.ts` | The subset of `hass` this project depends on |
| `src/ha/useEntities.ts` | Selective subscription — the performance core |
| `src/ha/HaCard.tsx` | Renders any Lovelace card inside React (the unstable-API boundary) |
| `src/components/` | Custom React components |
| `src/App.tsx` | Demo layout showing both kinds together |

Deliberately **no shadow DOM**. Staying in the light DOM lets HA's theme custom
properties (`--primary-text-color` and friends) cascade in, so a React panel
inherits the user's theme instead of looking foreign.

## Roadmap

- [ ] Component registry — declare standard + custom components with typed config
- [ ] Layout persistence (HA storage via WS, so layouts sync across devices)
- [ ] Drag-and-drop editor
- [ ] `useService`, `useHistory`, `useTemplate` hooks
- [ ] 3D floorplan reference component (react-three-fiber)
- [ ] Publish to HACS as a custom repository

## Licence

MIT.
