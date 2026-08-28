# Deploying

```bash
npm run deploy
```

Build, publish, bump the cache-buster, verify. That is the whole deploy.

## Pushing does NOT deploy

An earlier version of this file said `git push origin main` triggered a
watcher on the NAS that pulled, built, copied and bumped in ~20 s.

**There is no such watcher, and there is no evidence there ever was one.**
Checked over SSH on 2026-08-28: no clone of this repo anywhere on the NAS, no
matching process (every `watch`/`inotify` hit is stock QNAP), no cron entry
among the ~50 QTS ones, and no container for it. The panel's served bundle was
two days stale at that point with nothing on the way.

`git push` backs the repo up to GitHub. That is all it does. **Push to save
your work, run `npm run deploy` to ship it** — they are unrelated steps.

## Why it takes four steps

`Z:\config\www\` is container-owned and not writable from the desktop over
SMB, so the desktop cannot put the bundle where HA serves it. The workaround
is a staging directory HA can read and a shell_command that does the copy from
inside the container:

1. **Stage** `dist/react-for-home-assistant.js` to `Z:\config\yard_stage\react-home.js`.
   Must **truncate in place**. `cp` unlinks and recreates, which fails on the
   share with *"Device or resource busy"* — `cat src > dest` from a shell, or
   `writeFileSync` from node.
2. **`shell_command.publish_yard`** — defined in `configuration.yaml` as
   `cp /config/yard_stage/. /config/www/yard/ -r`. HA performs the copy.
3. **Bump `?v=` on the Lovelace resource.** Skip this and browsers keep serving
   the previous bundle no matter what is on disk.
4. **Verify over HTTP.** `tools/publish.mjs` byte-compares what the server
   actually returns against what was built, and fails loudly on a mismatch.

## Verify by hand

```bash
curl -s http://192.168.6.5:8123/local/yard/react-home.js | grep -c "<a string unique to your change>"
```

Browsers lie and caches lie. So does a stale `dist/` — editing without
rebuilding republishes the previous bundle and looks exactly like success,
which is why `npm run deploy` always builds first and why `npm run publish`
warns when `dist/` predates the last commit under `src/`.

## Requirements

`tools/publish.mjs` needs an HA long-lived access token at
`C:\Users\billwhalen\wyoming-ave-home\tools\ha\ha_token.txt` (gitignored —
create one at HA → profile → Security if it is missing).

## If you ever do want push-to-deploy

It would need node, a clone, and a supervised service on the NAS. QTS is a
poor host for that and firmware updates tend to remove it. A GitHub Actions
runner or a webhook into HA would be sturdier. Until then, the deploy is a
command you run on purpose — which at least cannot fail silently.
