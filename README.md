# 🏠 Self-Hosted Home Automation — Replacing alarm.com

A [Home Assistant](https://www.home-assistant.io/) setup built to **replace a paid
alarm.com subscription** with a self-hosted, locally-controlled smart home — no monthly
fee, no vendor lock-in, and automations that go well beyond what the subscription offered.
Security and monitoring lead; everything else (climate, shades, even an instrumented grow
tent) rides on the same local brain.

> **Why this exists:** dropping the recurring monthly cost of a proprietary security
> service, and owning the whole stack instead of renting it. The same platform that
> watches the doors also runs the rest of the house.

> **Status: mid-migration.** The Home Assistant side is live and expanding while the
> legacy service is wound down in parallel. This repo documents the cutover as it happens.

---

## 🎯 Goals of the migration

- **Kill the monthly fee** — replace a subscription with hardware that's paid for once.
- **Local control & privacy** — critical sensors run on the LAN, not a vendor cloud.
- **Do more, not less** — conditional alerts, cross-device automations, and dashboards a
  closed system can't offer.
- **One brain for the whole house** — security, climate, shades, and grow all in one place.

> ⚠️ **Honest note on monitoring:** a self-hosted setup like this is **self-monitored** by
> default — alerts go to your own devices, not a staffed monitoring center that dispatches
> emergency services. That's the right trade for many people (and the source of the
> savings), but it *is* a trade. If professional dispatch matters to you, some setups keep
> a slim monitored plan or add a third-party self-monitoring service alongside HA. Know
> which you're choosing.

---

## 📐 Architecture at a glance

```
                        ┌─────────────────────────────┐
                        │      Home Assistant          │
                        │  (Docker on a NAS via        │
                        │      Container Station)      │
                        │        + HACS                │
                        └──────────────┬──────────────┘
                                       │
     ┌───────────────┬────────────────┼───────────────┬───────────────┐
     │               │                │               │               │
┌────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼─────┐   ┌─────▼─────┐
│ Contact  │   │  Cameras  │   │  Door lock  │  │  Shades   │   │Grow tent  │
│ sensors  │   │ +doorbell │   │  (Z-Wave)   │  │ (Zigbee)  │   │(sensors + │
│(security)│   │  (Blink)  │   │  (Yale)     │  │ (Yoolax)  │   │ control)  │
└──────────┘   └───────────┘   └─────────────┘  └───────────┘   └───────────┘
   SECURITY  ◄──────────────────────────────►      COMFORT / CLIMATE / GROW
```

**Design principle — local first.** Safety- and security-critical signals run on **local**
integrations wherever possible, so a dropped internet connection never blinds the system.
Cloud integrations add convenience on top; they're never the only thing watching something
that matters.

---

## 🔐 Security & Monitoring (the core)

Replacing the paid service, piece by piece:

| Function | Device / method | Connection | Status |
|---|---|---|---|
| **Entry detection** | Door/window contact sensors | Local | 🔧 Migrating |
| **Cameras & doorbell** | Blink cameras + video doorbell | Cloud | ✅ Live |
| **Smart lock** | Yale Real Living deadbolt + Z-Wave Plus module | Local (Z-Wave) | 🔧 Planned |
| **Smart notifications** | Home Assistant automations → phone | Local logic | ✅ Live |

**What HA does that the subscription didn't:**
- **Conditional alerts** instead of all-or-nothing — e.g. notify on **person detection or
  doorbell press only**, suppress ordinary motion, and add presence/time conditions so you
  aren't pinged walking past your own door.
- **Cross-device logic** — a door event, a camera, and presence can be combined into one
  meaningful alert.
- **No per-month cost** for any of it.

---

## 🪟 Comfort & Climate

| Function | Device / method | Connection | Status |
|---|---|---|---|
| **Motorized shades** | Yoolax motorized shades (Zigbee) | Local (Zigbee) | 🔧 In progress |

See the [Yoolax spotlight](#-spotlight-yoolax-zigbee-shades) below.

---

## 🌱 Grow Tent (one room, fully instrumented)

One of the rooms this stack watches is an indoor grow tent — a good stress-test for the
"never be blind to a failure" philosophy, since a missed problem there has a real cost.

> A previous grow was set back when a device came unplugged and a pot dried out for six
> days unnoticed. The grow-tent instrumentation exists so that can't happen silently again.

| Function | Device / method | Connection | Status |
|---|---|---|---|
| **Soil moisture** ⭐ | Ecowitt soil probe (local polling) | Local | ✅ Live |
| **Tent climate + device control** | VivoSun GrowHub + AeroStream + drip | Cloud | ✅ Live |
| **Environment/weather** | Ecowitt gateway + outdoor station | Local | ✅ Live |

The soil-moisture probe runs on a **fully local** integration so the dry-out alarm works
even if the internet is down — the single most safety-critical sensor in the whole house,
by this project's logic.

---

## 🔌 Integrations & Repositories

| Integration | Source | Connection | Status |
|---|---|---|---|
| **HACS** | [hacs.xyz](https://hacs.xyz) | — | ✅ Live |
| **Blink** (cameras/doorbell) | Home Assistant core | Cloud | ✅ Live |
| **Ecowitt Local** (soil/environment) | [`alexlenk/ecowitt_local`](https://github.com/alexlenk/ecowitt_local) | Local LAN polling | ✅ Live |
| **VivoSun GrowHub** (tent) | [`lientry/homeassistant-vivosun-growhub`](https://github.com/lientry/homeassistant-vivosun-growhub) | Cloud (vendor API) | ✅ Live |
| **Z-Wave JS** (Yale lock) | Home Assistant core + USB coordinator | Local (Z-Wave) | ✅ Live |
| **ZHA / Zigbee2MQTT** (Yoolax shades) | Home Assistant core + USB coordinator | Local (Zigbee) | 🔧 In progress |
| **Contact sensors** | (radio depends on sensor type) | Local | 🔧 Migrating |

📄 **Full setup steps:** see [INSTALL.md](./INSTALL.md) for how the platform and each
integration are configured from scratch, plus hosting options for people not on a NAS.

---

## 🤖 Automations (design intent)

| Automation | Trigger | Purpose |
|---|---|---|
| **Smart door alerts** | Person detection **or** doorbell press | Replace noisy motion spam with signal |
| **Entry alerts** | Contact sensor opened (conditioned on away/armed) | Core security notification, no monthly fee |
| **Dry-pot alarm** ⭐ | Soil moisture below threshold, sustained | Catch a grow-tent dry-out in an hour, not six days |
| **Device-offline alert** | A critical device reads off/unavailable when it shouldn't | Catch the "unplugged" failure automatically |
| **Humidifier empty** | Water-level sensor reports empty | Protect flowering-stage humidity |

*Automations layer on top of vendor apps, never in place of them — each critical value has
more than one thing watching it.*

---

## 🪟 Spotlight: Yoolax Zigbee Shades

This build standardizes window automation on **Yoolax motorized shades (Zigbee)**,
integrated locally through a Zigbee coordinator — no per-vendor cloud or proprietary bridge
required, which is exactly the open, local-first approach the whole stack is built around.

**Planned integration work:**
- Local Zigbee pairing (ZHA / Zigbee2MQTT) — no cloud dependency
- Cover entities for position control + scheduling
- Automations: sunrise/sunset scheduling, temperature-based shading, scene integration

**Why Yoolax fits this project:** motorized shades that speak **standard Zigbee** drop
straight into an open smart-home stack and work alongside everything else — no walled
garden. This page documents the real-world integration as it comes together, with setup
notes for others building the same thing.

*(Updated as units are installed and any vendor collaboration on hardware progresses.)*

---

## 🗺️ Roadmap

- [x] Home Assistant on a NAS (Docker) + HACS
- [x] Blink cameras/doorbell — live
- [x] Smart door notifications (person/doorbell only)
- [x] Grow-tent monitoring (soil + climate) — live
- [ ] Door/window contact sensors — finish migration off alarm.com
- [ ] Yale deadbolt via Z-Wave coordinator
- [ ] Yoolax Zigbee shades
- [ ] Unified security dashboard + arm/disarm logic
- [ ] Decommission the paid subscription

---

## ⚠️ Notes & Disclaimers

- This is a **self-monitored** setup by default (see the note up top). It is not a
  substitute for professionally-monitored security unless you deliberately add that.
- Several integrations are **community-maintained and unofficial** — used here for
  monitoring and convenience, with vendor apps retained as safety nets for anything
  critical. Treat community integrations as tinker-grade, not appliance-grade.
- Software versions and steps move quickly — check each linked repo's current README
  before installing.
- This document is intentionally **generic**: no addresses, network details, serial
  numbers, account identifiers, or location data.

---

*Built by a hands-on maker replacing rented security with something owned, local, and more
capable — one room (and one subscription line item) at a time.*
