# Home Automation Stack

A self-hosted [Home Assistant](https://www.home-assistant.io/) setup that unifies an
indoor grow tent, environmental sensors, security, and whole-home automation under one
local brain. Built with a deliberate bias toward **local control**, **redundant
monitoring**, and **catching failures before they cost a harvest**.

> **Why this exists:** A previous grow was set back when a device came unplugged and a
> pot dried out for six days before anyone noticed. Every design choice here traces back
> to one goal — *never be blind to a failure again.* Reminders nag, an app records, and
> Home Assistant watches the hardware and shouts when a number goes wrong. Three
> independent safety nets under the same tightrope.

---

## 📐 Architecture at a glance

```
                        ┌─────────────────────────────┐
                        │      Home Assistant          │
                        │  (Docker on QNAP NAS via     │
                        │      Container Station)      │
                        │        + HACS                │
                        └──────────────┬──────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
   ┌────▼────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐  ┌─────▼─────┐
   │ Ecowitt │   │  VivoSun  │   │   Yale    │   │   Blink   │  │  Yoolax   │
   │  (LOCAL)│   │ GrowHub   │   │ Deadbolt  │   │  Cameras  │  │  Shades   │
   │  poll   │   │  (CLOUD)  │   │ (Z-Wave)  │   │  (CLOUD)  │  │  (Zigbee) │
   └─────────┘   └───────────┘   └───────────┘   └───────────┘  └───────────┘
    soil/climate   tent climate    door lock      motion/clips    window shades
                   + device ctrl
```

**Design principle — local first.** The most safety-critical sensor (soil moisture)
runs on a **fully local** integration with no cloud dependency, so a dropped internet
connection never blinds the dry-out alarm. Cloud integrations layer convenience on top;
they are never the only thing watching a critical value.

---

## 🧰 Hardware Inventory

| Category | Device | Role |
|---|---|---|
| **Compute** | QNAP NAS (Container Station / Docker) | Runs Home Assistant 24/7 |
| **Grow controller** | VivoSun GrowHub E42A | Tent climate control + device scheduling |
| **Humidifier / circulation** | VivoSun AeroStream H19 | In-tent humidity + air movement, water-level sensor |
| **Irrigation** | VivoSun Drip Irrigation (smart plug) | Automated watering, on/off control |
| **Environment sensor gateway** | Ecowitt Wi-Fi gateway | Bridges wireless probes to the LAN |
| **Soil probe** | Ecowitt soil-moisture sensor | The dry-out alarm — most critical sensor |
| **Weather station** | Ecowitt outdoor weather station | Outdoor temp/humidity/wind/rain (bundled; not grow-critical) |
| **Door lock** | Yale Real Living deadbolt + Z-Wave Plus module | Smart lock, status + remote control |
| **Cameras** | Blink cameras + video doorbell | Motion detection, doorbell, clips |
| **Window shades** | Yoolax motorized shades (Zigbee) | Automated shading *(integration in progress)* |

---

## 🔌 Integrations & Repositories

| Integration | Source | Connection | Status |
|---|---|---|---|
| **Ecowitt Local** | [`alexlenk/ecowitt_local`](https://github.com/alexlenk/ecowitt_local) | Local LAN polling | ✅ Live |
| **VivoSun GrowHub** | [`lientry/homeassistant-vivosun-growhub`](https://github.com/lientry/homeassistant-vivosun-growhub) | Cloud (vendor API) | ✅ Live |
| **HACS** | [hacs.xyz](https://hacs.xyz) | — | ✅ Live |
| **Blink** | Home Assistant core integration | Cloud | ✅ Live |
| **Yale / Z-Wave** | Z-Wave JS (core) + USB coordinator | Local (Z-Wave radio) | 🔧 Planned |
| **Yoolax shades** | Zigbee via ZHA or Zigbee2MQTT + coordinator | Local (Zigbee radio) | 🔧 In progress |

---

## 📖 Setup & Configuration — by device

### 1. Home Assistant on QNAP (the foundation)

Home Assistant runs as a Docker container through QNAP's **Container Station**, using the
official `ghcr.io/home-assistant/home-assistant:stable` image.

Key points that make it work on a NAS:
- **Network mode: `host`** — mandatory. HA must sit directly on the LAN to discover local
  devices (the Ecowitt gateway, Zigbee/Z-Wave coordinators, etc.). Bridge mode breaks
  discovery.
- **Config persisted to a NAS share** — the container's `/config` is bind-mounted to a
  folder on the NAS so nothing is lost across container updates.
- **`privileged: true`** — smooths hardware/USB access for later radio dongles.
- Pin to a specific image tag rather than `latest` for predictable updates.

> **NAS caveat:** Home Assistant on a NAS is the *Container* build — no Supervisor and no
> one-click Add-on store. All integrations and HACS work normally; anything a tutorial
> installs as an "add-on" (e.g. an MQTT broker) you run as its own separate container.

### 2. HACS (Home Assistant Community Store)

Installed via the official in-container installer, then added as an integration and
authorized against a GitHub account. HACS is the prerequisite for the community
integrations below (Ecowitt Local, VivoSun GrowHub).

### 3. Ecowitt Local — soil moisture & environment ⭐

**The most important integration in the stack.** Uses
[`alexlenk/ecowitt_local`](https://github.com/alexlenk/ecowitt_local), which **polls the
Ecowitt gateway directly over the LAN** — no cloud, no webhook round-trip.

Why this one over the webhook-based approach:
- **Fully local** — the dry-out alarm keeps working even if the internet is down.
- **Stable, hardware-ID-based entity names** — replace a dead probe battery and your
  automations, dashboards, and history keep working unchanged.

Setup outline:
1. Install via HACS (custom repository), restart HA.
2. Point the integration at the gateway's LAN address.
3. Soil-moisture and environment entities appear automatically.
4. Health check: the gateway's `/get_livedata_info` endpoint returns JSON when its local
   API is alive.

> **Subnet note:** if the gateway and the NAS live on different subnets/VLANs, confirm
> they can route to each other — HA has to reach the gateway to poll it.

### 4. VivoSun GrowHub — tent climate & device control

Uses [`lientry/homeassistant-vivosun-growhub`](https://github.com/lientry/homeassistant-vivosun-growhub).
Brings the GrowHub E42A, AeroStream H19, and drip plug into HA as controllable entities,
plus inside/outside temp, humidity, and VPD telemetry and per-device schedules.

Setup outline:
1. Add as a HACS custom repository (category: Integration), restart HA.
2. Add the integration and authenticate with the vendor account (cloud + AWS IoT, so the
   host needs outbound internet).
3. Devices populate as light / fan / humidifier / climate / sensor entities.

> **Honest status:** community-maintained and unofficial. Excellent for monitoring and
> alerts; the vendor app is kept as a safety net. Custom grow *recipes* aren't exposed to
> HA yet, so the recipe keeps running on the GrowHub itself while HA reads and alerts.

### 5. Yale deadbolt — Z-Wave 🔧

A Yale Real Living deadbolt with a Z-Wave Plus module. **Z-Wave is its own radio
protocol** — Home Assistant needs a Z-Wave USB coordinator plugged into the NAS and
passed through to the container, then driven by the core **Z-Wave JS** integration.
Planned; requires the USB coordinator and Docker device passthrough.

### 6. Blink cameras — motion, clips & smart notifications

Connected through the core Blink integration. Rather than the vendor app's noisy
all-or-nothing alerts, notifications are handled by **Home Assistant automations** so they
can be made conditional — e.g. notify on **person detection or doorbell press only**,
suppress plain motion, and add presence/time conditions to cut false alerts.

### 7. Yoolax motorized shades — Zigbee 🔧

**Newly added — Zigbee models.** Connect via a **Zigbee coordinator** (USB dongle) on the
NAS, using either **ZHA** (built into HA) or **Zigbee2MQTT**. Once paired, shades expose
as cover entities for position control and scheduling (e.g. tie to sunrise/sunset or
room temperature). Integration in progress. See the spotlight below.

---

## 🤖 Automations (design intent)

| Automation | Trigger | Purpose |
|---|---|---|
| **Dry-pot alarm** ⭐ | Soil moisture below threshold, sustained | The headline safeguard — catch a dry-out in an hour, not six days |
| **Device-offline alert** | A critical device reads off/unavailable during a period it should be on | Catch the "unplugged" failure automatically |
| **Humidifier empty** | Water-level sensor reports empty | Protect flowering-stage humidity targets |
| **Smart door alerts** | Person detection **or** doorbell press | Replace noisy motion spam with signal |
| **Reservoir out of range** | pH / temp drift beyond band | Give a dumb heater the logic it lacks |

*Automations are layered on top of the vendor apps, not in place of them — each critical
value has more than one thing watching it.*

---

## 🪟 Spotlight: Yoolax Zigbee Shades

This build is standardizing window automation on **Yoolax motorized shades (Zigbee)**,
integrated locally into Home Assistant through a Zigbee coordinator — no per-vendor cloud
or bridge required, which is exactly the kind of open, local-first integration this stack
is built around.

**Planned integration work:**
- Local Zigbee pairing (ZHA / Zigbee2MQTT) — no cloud dependency
- Cover entities for position control + scheduling
- Automations: sunrise/sunset scheduling, temperature-based shading, scene integration

**Why Yoolax fits this project:** motorized shades that speak **standard Zigbee** drop
straight into an open smart-home stack and just work alongside everything else — no
walled garden. This page documents the real-world integration as it comes together, with
setup notes for others building the same thing.

*(This section will be updated as units are installed and any vendor collaboration on
hardware progresses.)*

---

## 🗺️ Roadmap

- [x] Home Assistant on QNAP (Docker)
- [x] HACS
- [x] Ecowitt Local (soil + environment) — live
- [x] VivoSun GrowHub — live
- [x] Blink cameras — live
- [ ] Grow-tent dashboard (soil + device status front and center)
- [ ] Dry-pot + device-offline automations
- [ ] Yale deadbolt via Z-Wave coordinator
- [ ] Yoolax Zigbee shades
- [ ] Reservoir pH/temp logic

---

## ⚠️ Notes & Disclaimers

- Several integrations are **community-maintained and unofficial**. They're used here for
  monitoring and convenience; vendor apps are retained as safety nets for anything
  critical. Treat community integrations as tinker-grade, not appliance-grade.
- Software versions and install steps move quickly — always check each linked repo's
  current README before installing.
- This document is intentionally **generic**: no addresses, network details, serial
  numbers, account identifiers, or location data are included.

---

*Built by a hands-on maker who'd rather over-instrument the tent than lose another six
days to a quiet failure.*
