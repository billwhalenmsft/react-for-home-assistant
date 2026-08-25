# 🛠️ Installation Guide — Home Assistant Grow Stack

How to reproduce this setup from scratch: Home Assistant running in a container on a
QNAP NAS, then the community integrations that make the grow stack work. Written
generic — substitute your own paths and addresses where you see `<angle brackets>`.

> **New to this?** Skip to [Choosing where to run Home Assistant](#-choosing-where-to-run-home-assistant)
> first. Running on a NAS is a great fit if you already own one, but it's not the only —
> or even the default — way to do it.

---

## Table of contents

1. [Choosing where to run Home Assistant](#-choosing-where-to-run-home-assistant)
2. [Install path used here: QNAP + Container Station](#-install-path-used-here-qnap--container-station)
3. [Step 1 — Prepare a config folder](#step-1--prepare-a-config-folder)
4. [Step 2 — Create the Home Assistant container](#step-2--create-the-home-assistant-container)
5. [Step 3 — First boot & onboarding](#step-3--first-boot--onboarding)
6. [Step 4 — Install HACS](#step-4--install-hacs)
7. [Step 5 — Add the integrations](#step-5--add-the-integrations)
8. [Editing config from your PC](#-editing-config-from-your-pc-optional)
9. [Troubleshooting](#-troubleshooting)

---

## 🧭 Choosing where to run Home Assistant

Home Assistant ships in **four flavors**. Which you pick decides what features you get —
this matters, so read before you build.

| Install method | Supervisor + Add-on store? | Runs alongside other apps? | Best for |
|---|---|---|---|
| **HA Operating System** | ✅ Yes | ❌ Takes over the whole device | Most people; the officially recommended path |
| **HA Supervised** | ✅ Yes | ⚠️ Possible, strict requirements | Advanced users on Debian |
| **HA Container** (Docker) | ❌ No | ✅ Yes | Running on a NAS/server you already have |
| **HA Core** (Python venv) | ❌ No | ✅ Yes | Developers/tinkerers only |

**This build uses HA Container** (Docker on a NAS). The tradeoff is deliberate:

- ✅ **Gains:** runs on hardware that's already on 24/7, alongside existing NAS workloads;
  nothing new to buy.
- ❌ **Loses:** no Supervisor, so **no one-click Add-on store**. Every integration and
  HACS still works; anything normally installed as an "add-on" (an MQTT broker, say) you
  run as its own separate container instead.

### Where can the container run?

Any Docker host works. Common choices:

| Host | Notes |
|---|---|
| **QNAP NAS** (Container Station) | Used here. GUI-driven Docker/Compose. |
| **Synology NAS** (Container Manager) | Very similar to QNAP; same Compose approach. |
| **Raspberry Pi** | Cheap, low-power. A Pi 4/5 with SSD is plenty. (Or just run HA OS on it.) |
| **Mini PC / NUC** | Great price/performance; run HA OS bare-metal or Docker. |
| **Existing Linux server** | `docker compose up -d` and done. |
| **Proxmox / VM** | Popular for HA OS in a VM with USB passthrough for radios. |
| **Unraid** | Community template available. |

> **Recommendation for newcomers:** if you're buying hardware specifically for this, a
> **Home Assistant Green** appliance or a **Raspberry Pi running HA Operating System**
> gives you the full experience (Supervisor + add-ons) with the least friction. Choose the
> **Container** path (this guide) when you want to reuse a NAS/server you already run.

### One thing to plan for: local radios

Some devices aren't Wi-Fi and need their own radio dongle plugged into the host:

- **Zigbee** (e.g. Yoolax shades) → Zigbee USB coordinator + ZHA or Zigbee2MQTT
- **Z-Wave** (e.g. Yale deadbolt) → Z-Wave USB coordinator + Z-Wave JS

On a NAS/Docker host these require **USB passthrough** into the container, and the host
must be physically near the devices (or use a network-attached radio). If you plan to lean
heavily on Zigbee/Z-Wave, factor this in when choosing where HA runs.

---

## 📦 Install path used here: QNAP + Container Station

**Prerequisites**
- A QNAP NAS with **Container Station** installed (from the QNAP App Center).
- The NAS's IP address on your network.
- A GitHub account (free — needed for HACS).

---

### Step 1 — Prepare a config folder

Home Assistant's configuration needs to live on the NAS filesystem so it survives
container updates.

1. Open **File Station**.
2. Create a folder to hold the config, e.g. a `homeassistant` folder with a `config`
   subfolder inside it.
3. **Note the real filesystem path.** This is the #1 gotcha: File Station *displays* a
   path like `/<Share>/<folder>/config`, but the actual path Docker needs is usually
   prefixed with `/share/`. Right-click the folder → **Properties** to see the true
   location. It typically resolves to something like:

   ```
   /share/<Share>/<folder>/config
   ```

   You'll paste this exact path into the container config in the next step.

---

### Step 2 — Create the Home Assistant container

In **Container Station → Create → Create Application**, paste a Compose definition.
This is the working configuration (edit the two marked values):

```yaml
services:
  homeassistant:
    container_name: homeassistant
    image: "ghcr.io/home-assistant/home-assistant:stable"
    volumes:
      - /share/<Share>/<folder>/config:/config   # <-- EDIT: your real config path
      - /etc/localtime:/etc/localtime:ro
      - /run/dbus:/run/dbus:ro
    restart: unless-stopped
    privileged: true
    network_mode: host
    environment:
      TZ: <Your/Timezone>                          # <-- EDIT: e.g. America/Chicago
```

**Why each line matters:**

| Setting | Why it's there |
|---|---|
| `network_mode: host` | **Mandatory.** HA must be directly on the LAN to discover local devices and reach the Ecowitt gateway / Zigbee / Z-Wave radios. Bridge mode breaks discovery. |
| `volumes: …/config:/config` | Persists all config to the NAS so container updates don't wipe it. **Left** side = your real NAS path; **right** side stays `/config`. |
| `privileged: true` | Smooths hardware/USB access for radio dongles added later. |
| `restart: unless-stopped` | HA comes back automatically after a reboot or crash. |
| `image: …:stable` | Pin to `stable` (or a specific version) rather than `latest` for predictable updates. |

Name the application `homeassistant` and create it. First run pulls the image (a few
minutes). It shows **Running** / green in the Containers list when up. A healthy first
boot log shows a series of `s6-rc` services starting; an upstream Python deprecation
warning in the log is harmless.

> **GUI alternative:** you can instead Create a container from the
> `homeassistant/home-assistant` image and set the same three things (Host network,
> `/config` bind mount, `TZ` variable) in Advanced Settings. Compose is cleaner and
> self-documenting.

---

### Step 3 — First boot & onboarding

1. Browse to `http://<NAS-IP>:8123`. Give it a minute on first boot — HA unpacks itself
   before serving the page. If it doesn't load, wait 30–60 seconds and refresh.
2. Create your **admin account** (stored locally on the NAS — nothing goes to the cloud).
3. Name the home, set location/units, finish onboarding.

You now have an empty, running Home Assistant.

---

### Step 4 — Install HACS

HACS (Home Assistant Community Store) is required for the community integrations below.

1. In Container Station, open a **Terminal / Console** into the `homeassistant`
   container (choose `/bin/bash`). You'll land at a `/config#` prompt.
2. Run the official installer:

   ```bash
   wget -O - https://get.hacs.xyz | bash -
   ```

   It downloads into `custom_components`, verifies versions, and finishes with a note to
   restart Home Assistant.
3. **Restart HA** (Settings → System → Restart, or restart the container).
4. **Settings → Devices & Services → Add Integration → HACS.** Tick the acknowledgements,
   then authorize with the **GitHub device code** it shows (opens github.com in a new tab
   — paste the code, approve). HACS then appears in the sidebar.

> The GitHub step is HACS asking permission to pull integrations from GitHub on your
> behalf — normal and expected.

---

### Step 5 — Add the integrations

With HACS in place, add each integration. Full per-device notes live in the main
[README](./README.md#-setup--configuration--by-device); short version:

**Ecowitt Local** (do this first — it's local and the most safety-critical)
1. HACS → Custom repositories → add `alexlenk/ecowitt_local` (category: Integration).
2. Install, restart HA.
3. Add the integration, point it at the gateway's LAN address.
4. Verify: the gateway's `/get_livedata_info` endpoint returns JSON.

**VivoSun GrowHub**
1. HACS → Custom repositories → add `lientry/homeassistant-vivosun-growhub`
   (category: Integration).
2. Install, restart HA.
3. Add the integration, sign in with the vendor account (needs outbound internet).

**Blink** — core integration, add via Settings → Devices & Services → Add Integration.

**Z-Wave (Yale) / Zigbee (Yoolax)** — plug in the USB coordinator, pass it through to the
container, then add **Z-Wave JS** / **ZHA** and pair devices.

---

## 💻 Editing config from your PC (optional)

Because the config lives on a NAS share, you can edit files from a desktop instead of the
in-container terminal:

- Map the NAS share as a network drive (e.g. `\\<NAS-IP>\<share>\<folder>`).
- Point an editor — or a coding assistant — at the mounted `config` folder to edit
  `configuration.yaml`, dashboards, and `automations.yaml` directly.
- **Back up before bulk edits**, and never overwrite `configuration.yaml` blindly — it's
  the brain of the whole system.

---

## 🧯 Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Web UI won't load after container starts | Still booting — wait 30–60s. Confirm `http://<NAS-IP>:8123` and that the container is green. |
| No devices discovered / integrations can't find gateways | `network_mode: host` missing. This is the most common mistake. |
| Config resets after an update | The `/config` bind mount isn't pointing at a real persistent NAS path. Re-check the path from File Station → Properties. |
| Integration can't reach a local gateway | Gateway and NAS on different subnets/VLANs that don't route. Confirm connectivity. |
| A `wget`/installer command "not found" | Try `curl` equivalent, or confirm you're inside the container shell (`/config#` prompt), not the NAS host shell. |
| Zigbee/Z-Wave dongle not seen | USB passthrough to the container not configured; host may need the device mapped in the container settings. |

---

## 📚 References

- Home Assistant — Installation: <https://www.home-assistant.io/installation/>
- Home Assistant — Docker/Container: <https://www.home-assistant.io/installation/#advanced-installation-methods>
- HACS: <https://hacs.xyz>
- Ecowitt Local: <https://github.com/alexlenk/ecowitt_local>
- VivoSun GrowHub: <https://github.com/lientry/homeassistant-vivosun-growhub>

> Versions and steps change over time — always check each project's current README before
> installing. This guide is intentionally generic and contains no addresses, serial
> numbers, account identifiers, or location data.
