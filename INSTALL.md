# 🛠️ Installation Guide

How to reproduce this setup from scratch: Home Assistant running in a container on a NAS,
the integrations that make it a house rather than a light switch, and the React panel in
this repo. Written generic — substitute your own paths and addresses where you see
`<angle brackets>`.

> **New to this?** Skip to [Choosing where to run Home Assistant](#-choosing-where-to-run-home-assistant)
> first. Running on a NAS is a great fit if you already own one, but it's not the only —
> or even the default — way to do it.

> **Only want the panel?** Jump to [Step 6](#step-6--install-the-estate-panel). It needs a
> working Home Assistant and nothing else from this guide.

---

## Table of contents

1. [Choosing where to run Home Assistant](#-choosing-where-to-run-home-assistant)
2. [Install path used here: NAS + Container Station](#-install-path-used-here-nas--container-station)
3. [Step 1 — Prepare a config folder](#step-1--prepare-a-config-folder)
4. [Step 2 — Create the Home Assistant container](#step-2--create-the-home-assistant-container)
5. [Step 3 — First boot & onboarding](#step-3--first-boot--onboarding)
6. [Step 4 — Install HACS](#step-4--install-hacs)
7. [Step 5 — Add the integrations](#step-5--add-the-integrations)
8. [Step 6 — Install the Estate panel](#step-6--install-the-estate-panel)
9. [Step 7 — Point it at your house](#step-7--point-it-at-your-house)
10. [Working on the panel](#-working-on-the-panel)
11. [Editing config from your PC](#-editing-config-from-your-pc-optional)
12. [Troubleshooting](#-troubleshooting)

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
- ❌ **Loses:** no Supervisor, so **no one-click Add-on store**. Every integration and HACS
  still works; anything normally installed as an "add-on" (an MQTT broker, say) you run as
  its own separate container instead.

### Where can the container run?

Any Docker host works. Common choices:

| Host | Notes |
|---|---|
| **QNAP NAS** (Container Station) | Used here. GUI-driven Docker/Compose. |
| **Synology NAS** (Container Manager) | Very similar; same Compose approach. |
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

- **Zigbee** (shades, sensors, plugs) → Zigbee USB coordinator + ZHA or Zigbee2MQTT
- **Z-Wave** (deadbolts, some sensors) → Z-Wave USB coordinator + Z-Wave JS

On a NAS/Docker host these require **USB passthrough** into the container, and the host
must be physically near the devices (or use a network-attached radio).

**And a container's `/dev` is a snapshot taken when it started.** Plug a radio in, or load
its driver, while the container is running and the device node appears on the *host* and
not inside the container. Restarting Home Assistant does nothing for this — it restarts a
process, not the namespace. **Restart the container.**

If you plan to lean heavily on Zigbee, Z-Wave or Bluetooth, factor all of this in when
choosing where Home Assistant runs.

**Four things that bite people here:**

- **Your host may not have the driver.** This is the one that cost days. A dongle can
  enumerate perfectly — the kernel sees the vendor and product — and still produce no
  `/dev/ttyUSB*`, because the USB-to-serial bridge inside it needs a driver the host
  hasn't loaded. Silicon Labs CP2102 bridges (`10c4:ea60`, which is most SONOFF sticks)
  need `cp210x`. Sticks that enumerate as **CDC-ACM** need nothing at all, which is why one
  radio can work while another sits dead in the next port. Diagnose it like this:

  ```sh
  ls -l /dev/serial/by-id/ /dev/ttyUSB* /dev/ttyACM*   # is there a port at all?
  ls /sys/bus/usb-serial/drivers/                       # which drivers exist?
  find /lib/modules -name 'cp210x*'                     # is the module on disk?
  sudo insmod /lib/modules/$(uname -r)/cp210x.ko        # load it (path varies!)
  ```

  On a NAS the module often ships but is never auto-loaded, and `modprobe` needs root.
  Make it permanent afterwards — QNAP does this via `/etc/config/autorun.sh` plus Control
  Panel → Hardware → "Run user defined processes during startup" — or your Zigbee network
  vanishes at the next reboot.

- **Range beats power.** A coordinator on the back of a NAS in a utility room, behind
  ductwork, will show a lock at the far end of the house sitting near the noise floor —
  and short frames (lock/unlock) will work while long ones (writing user codes) mostly
  fail, which reads like a broken lock rather than a radio problem. Use a USB extension and
  get the antenna into open air before you buy anything else.
- **USB 3 is loud** in the 2.4 GHz band. Keep Zigbee dongles off USB 3 ports and away from
  USB 3 cables and drives.
- **Dual-protocol dongles are either/or.** A coordinator advertising Zigbee *and* Thread
  runs one or the other depending on the firmware you flash — not both at once.

---

## 📦 Install path used here: NAS + Container Station

**Prerequisites**

- A NAS with **Container Station** (QNAP) or **Container Manager** (Synology) installed.
- The NAS's IP address on your network.
- A GitHub account (free — needed for HACS).

---

### Step 1 — Prepare a config folder

Home Assistant's configuration needs to live on the NAS filesystem so it survives container
updates.

1. Open **File Station**.
2. Create a folder to hold the config, e.g. a `homeassistant` folder with a `config`
   subfolder inside it.
3. **Note the real filesystem path.** This is the #1 gotcha: File Station *displays* a path
   like `/<Share>/<folder>/config`, but the actual path Docker needs is usually prefixed
   with `/share/`. Right-click the folder → **Properties** to see the true location. It
   typically resolves to something like:

   ```
   /share/<Share>/<folder>/config
   ```

   You'll paste this exact path into the container config in the next step.

---

### Step 2 — Create the Home Assistant container

In **Container Station → Create → Create Application**, paste a Compose definition. This is
the working configuration (edit the two marked values):

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
| `network_mode: host` | **Mandatory.** HA must be directly on the LAN to discover local devices and reach local gateways / Zigbee / Z-Wave radios. Bridge mode breaks discovery. |
| `volumes: …/config:/config` | Persists all config to the NAS so container updates don't wipe it. **Left** side = your real NAS path; **right** side stays `/config`. |
| `privileged: true` | Smooths hardware/USB access for radio dongles added later. |
| `restart: unless-stopped` | HA comes back automatically after a reboot or crash. |
| `image: …:stable` | Pin to `stable` (or a specific version) rather than `latest` for predictable updates. |

Name the application `homeassistant` and create it. First run pulls the image (a few
minutes). It shows **Running** / green in the Containers list when up. A healthy first boot
log shows a series of `s6-rc` services starting; an upstream Python deprecation warning in
the log is harmless.

> **GUI alternative:** you can instead create a container from the
> `homeassistant/home-assistant` image and set the same three things (host network,
> `/config` bind mount, `TZ` variable) in Advanced Settings. Compose is cleaner and
> self-documenting.

---

### Step 3 — First boot & onboarding

1. Browse to `http://<NAS-IP>:8123`. Give it a minute on first boot — HA unpacks itself
   before serving the page. If it doesn't load, wait 30–60 seconds and refresh.
2. Create your **admin account** (stored locally on the NAS — nothing goes to the cloud).
3. Name the home, set location/units, finish onboarding.
4. **Turn on multi-factor auth** on the owner account before you expose anything remotely
   (Profile → Security). If you later add remote access, this is the login that faces the
   internet.

You now have an empty, running Home Assistant.

---

### Step 4 — Install HACS

HACS (Home Assistant Community Store) is required for the community integrations below.

1. In Container Station, open a **Terminal / Console** into the `homeassistant` container
   (choose `/bin/bash`). You'll land at a `/config#` prompt.
2. Run the official installer:

   ```bash
   wget -O - https://get.hacs.xyz | bash -
   ```

   It downloads into `custom_components`, verifies versions, and finishes with a note to
   restart Home Assistant.
3. **Restart HA** (Settings → System → Restart, or restart the container).
4. **Settings → Devices & Services → Add Integration → HACS.** Tick the acknowledgements,
   then authorize with the **GitHub device code** it shows (opens github.com in a new tab —
   paste the code, approve). HACS then appears in the sidebar.

> The GitHub step is HACS asking permission to pull integrations from GitHub on your
> behalf — normal and expected.

---

### Step 5 — Add the integrations

With HACS in place, add each integration. Short version, in the order that has caused the
least pain:

**Local sensors first** — they're the ones that must work when the internet doesn't.

1. HACS → Custom repositories → add the integration's repo (category: Integration).
2. Install, restart HA.
3. Add the integration and point it at the gateway's LAN address.
4. Verify at the source: most local gateways expose a JSON endpoint you can hit in a
   browser. If that returns data and HA doesn't, the problem is HA's config, not the
   device.

**Cloud/vendor integrations** — sign in with the vendor account; needs outbound internet.

**Core integrations** (cameras, media players, weather) — Settings → Devices & Services →
Add Integration.

**Thermostats on a vendor device API** typically need a cloud project, an OAuth client and
a Pub/Sub topic before HA can see them. Budget an evening; the HA docs for your specific
thermostat are the authority, and the consent screen is the last step, not the first.

**Z-Wave / Zigbee**

1. Plug the USB coordinator into the host — **on a USB extension, not flush against the
   chassis** (see the radio notes above).
2. Pass the device through to the container. Find it by its stable path:

   ```bash
   ls -l /dev/serial/by-id/
   ```

   Use that `/dev/serial/by-id/...` path, not `/dev/ttyUSB0` — the numbered name changes
   when devices re-enumerate, and your radio silently stops working after a reboot.
3. Add it to the container:

   ```yaml
       devices:
         - /dev/serial/by-id/<your-coordinator>:/dev/serial/by-id/<your-coordinator>
   ```

4. Add **Z-Wave JS** or **ZHA** in Settings → Devices & Services. Both will offer to
   auto-detect the stick.
5. Pair devices one at a time, next to the coordinator where the manufacturer allows it,
   then move them into place.

### Bluetooth, if you have none

A NAS usually has no Bluetooth radio at all, which means Home Assistant has no `bluetooth`
integration and nothing BLE works — including devices you already own and assumed were
supported. The cheapest fix is an **ESP32 running the ESPHome Bluetooth Proxy**:

1. Plug an ESP32 dev board into your PC over USB, in Chrome or Edge, with a **data** cable.
2. Flash it from the ESPHome Bluetooth Proxy web installer — click-to-flash, no build
   environment. Pick the plain **ESP32** target for an ESP-WROOM-32.
3. Give it **2.4 GHz** Wi-Fi in the same flow; ESP32s have no 5 GHz radio.
4. Power it wherever you need coverage. Home Assistant discovers it through the ESPHome
   integration and creates the `bluetooth` entry on first connect.

That board becomes the house's BLE radio, so place it for the devices you care about
rather than next to the server. Signal in the −80s dBm works but is not comfortable; a
second board is cheaper than debugging flaky range.

Once it is up, this is how you find out what an unlabelled device actually is — the
advertisement tells you the vendor even when the product page won't:

```js
// Developer Tools → Template won't do this; use the websocket API.
{ "type": "bluetooth/subscribe_advertisements" }
```

Look at `service_uuids` and the manufacturer id. `fd50` / `0x07D0` is Tuya. `fe50` is a
Blind Engine AM43. Names are often absent, so the UUIDs do the identifying.

**A note on backups before you go further:** Settings → System → Backups, set an automatic
schedule with retention. Then arrange a copy *off* the machine — a backup living on the
box it protects is not a backup.

---

### Step 6 — Install the Estate panel

The panel is a single self-contained ES module. It is not published to HACS's default
store, so install it as a custom repository or build it yourself.

**Option A — build from source (what the author does)**

```bash
git clone <this-repo>
cd react-for-home-assistant
npm install
npm run build          # -> dist/react-for-home-assistant.js
```

Copy the built file into Home Assistant's `www/` folder (served at `/local/`):

```
<config>/www/react-for-home-assistant.js
```

**Option B — HACS custom repository**

HACS → three-dot menu → Custom repositories → add this repo with category **Plugin**, then
install. HACS drops the file into `www/community/...` and can add the resource for you.

**Register it.** The bundle defines two custom elements, and which one you want depends on
whether you're replacing a dashboard or adding to one:

*As a full-page panel* — in `configuration.yaml`, then restart HA:

```yaml
panel_custom:
  - name: react-for-home-assistant
    url_path: estate
    sidebar_title: Estate
    sidebar_icon: mdi:home-analytics
    module_url: /local/react-for-home-assistant.js?v=1
    require_admin: false
```

*As a card on an existing dashboard* — Settings → Dashboards → three-dot menu → Resources →
Add, `/local/react-for-home-assistant.js?v=1`, type **JavaScript module**. Then add a
manual card:

```yaml
type: custom:react-home-card
```

**The `?v=` is not optional.** Home Assistant serves `/local/` with long cache headers, so
republishing a file at the same URL changes nothing in an already-open browser: you get the
old bundle and conclude your change didn't work. Bump the number on every deploy.

---

### Step 7 — Point it at your house

Out of the box the panel runs against `src/house/sample.ts` — invented entity ids, an
invented family, a plain rectangular floorplan. It will render, and almost every tile will
say *unavailable*, because none of those entities exist in your Home Assistant.

To make it yours:

```bash
cp src/house/sample.ts src/house/local.ts
```

Edit `local.ts` so each id matches a real entity, and rebuild. `local.ts` is git-ignored and
takes precedence automatically — no other file needs changing.

Finding your ids: **Developer Tools → States** lists every entity in your house. Work
top-down through the config; the sections are grouped by page, so you can do Security
tonight and Grow next week. Anything left pointing at a sample id renders as unavailable
rather than breaking the page.

Two fields are worth calling out:

- **`headline`** expects a template sensor that summarises the house in one line. Any
  `sensor.*` works; if you don't have one, point it at anything and ignore the tile.
- **`plan`** is the floorplan. The room boxes are in image pixels, matched to a rendered
  PNG in `/local/`. The sample is a plain rectangle so the page works before you have a
  drawing; replacing it means tracing your own plan and emitting the same structure. The
  Rooms *list* works from the `rooms` map regardless.

---

## 🧑‍💻 Working on the panel

```bash
npm run build     # production bundle
npx tsc --noEmit  # typecheck
```

**Offline harness.** `harness.html` runs the panel in a plain browser tab against a
snapshot of entity states — no Home Assistant, no risk of commanding real hardware. The
snapshot itself (`harness-states.js`) is git-ignored, because it is a complete inventory of
one real house. Generate your own from Developer Tools → Template with a script that dumps
`states` to `window.MOCK_ENTITIES = {…}` in the shape `{ s, a, lc, lu }`.

That harness is also the right way to test gesture and debounce logic: stub `hass.callService`
and dispatch synthetic pointer events, rather than dragging on a dial that is wired to a
real furnace.

**Deploying a change.** Build, copy to `www/`, bump the `?v=`, hard-reload. Then *verify the
bytes*, because browsers and caches both lie:

```bash
curl -s http://<HA>:8123/local/react-for-home-assistant.js | grep -c "<a string unique to your change>"
```

---

## 💻 Editing config from your PC (optional)

Because the config lives on a NAS share, you can edit files from a desktop instead of the
in-container terminal:

- Map the NAS share as a network drive (e.g. `\\<NAS-IP>\<share>\<folder>`).
- Point an editor — or a coding assistant — at the mounted `config` folder to edit
  `configuration.yaml`, dashboards, and `automations.yaml` directly.
- **Back up before bulk edits**, and never overwrite `configuration.yaml` blindly — it's the
  brain of the whole system.
- **Never hand-edit `.storage/` while HA is running.** That directory is HA's own database
  of registries and dashboards; it rewrites files from memory and will clobber your edits,
  or worse, load a half-written one.
- Keep features in `packages/` rather than growing one enormous `configuration.yaml`. A
  package file holds a feature's helpers, templates and automations together, which makes
  it reviewable and removable in one piece.

---

## 🧯 Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Web UI won't load after container starts | Still booting — wait 30–60s. Confirm `http://<NAS-IP>:8123` and that the container is green. |
| No devices discovered / integrations can't find gateways | `network_mode: host` missing. This is the most common mistake. |
| Config resets after an update | The `/config` bind mount isn't pointing at a real persistent NAS path. Re-check the path from File Station → Properties. |
| Integration can't reach a local gateway | Gateway and NAS on different subnets/VLANs that don't route. Confirm connectivity. |
| A `wget`/installer command "not found" | Try the `curl` equivalent, or confirm you're inside the container shell (`/config#` prompt), not the NAS host shell. |
| Zigbee/Z-Wave dongle not seen | Work down: does the host see the USB device, is a serial driver bound to it, does a `/dev/tty*` node exist, and does the *container* see that node. Those are four different failures with four different fixes. |
| Dongle enumerates but there is no `/dev/ttyUSB*` | Missing `cp210x` (or equivalent) driver on the host. See the radio notes above. |
| Port exists on the host, not in the container | The container's `/dev` was snapshotted at start. Restart the container, not Home Assistant. |
| Radio works for simple commands, fails for complex ones | Weak signal, not a broken device. Short frames survive a bad link; long encrypted writes don't. Move the antenna. |
| Panel change doesn't appear after deploy | `/local/` cache. Bump the `?v=` and hard-reload, then verify the served bytes with `curl`. |
| Panel is blank but the DOM is full | If the browser window isn't focused, CSS animations never get a start time and an entrance animation can hold `opacity: 0`. Check `document.visibilityState` before hunting a render bug. |
| A notification "does nothing" when tapped | iOS reads `data.url`, Android reads `data.clickAction`. Set both. |
| Thermostat commands fail with `429` | Vendor APIs rate-limit per *user*, not per app. Debounce: send the settled value, not one command per tap. |
| An automation errors with "action not found" | A notify group defined in YAML only loads at startup — reloading automations isn't enough. Restart HA. |

---

## 📚 References

- Home Assistant — Installation: <https://www.home-assistant.io/installation/>
- Home Assistant — Container: <https://www.home-assistant.io/installation/#advanced-installation-methods>
- Home Assistant — Packages: <https://www.home-assistant.io/docs/configuration/packages/>
- HACS: <https://hacs.xyz>
- ZHA: <https://www.home-assistant.io/integrations/zha/>
- Z-Wave JS: <https://www.home-assistant.io/integrations/zwave_js/>
- ESPHome: <https://esphome.io/>

> Versions and steps change over time — always check each project's current README before
> installing. This guide is intentionally generic and contains no addresses, serial
> numbers, account identifiers, or location data.
