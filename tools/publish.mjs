// publish.mjs — build output -> live panel, in one step.
//
//   npm run deploy      # build, publish, bump, verify
//   node tools/publish.mjs --skip-build-check
//
// There is NO deploy watcher on the NAS. An earlier version of DEPLOY.md
// claimed `git push` triggered one; on 2026-08-28 the NAS was checked and no
// clone, no process, and no cron entry existed. Pushing deploys nothing. This
// script is the deploy.
//
// The four steps, each of which has bitten someone before:
//   1. write dist/ into Z:\config\yard_stage\react-home.js
//      -- MUST truncate in place. `cp` unlinks and recreates, which fails on
//         the SMB share with "Device or resource busy".
//   2. call shell_command.publish_yard, because www/ is container-owned and
//      not writable from the desktop. HA does the copy itself.
//   3. bump the ?v= on the Lovelace resource, or browsers keep the old bundle.
//   4. re-fetch over HTTP and prove the change is actually being served.

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const HA_HOST = '192.168.6.5:8123';
const TOKEN_FILE = 'C:/Users/billwhalen/wyoming-ave-home/tools/ha/ha_token.txt';
const DIST = new URL('../dist/react-for-home-assistant.js', import.meta.url).pathname.replace(/^\//, '');
const STAGE = 'Z:/config/yard_stage/react-home.js';
const SERVED = `http://${HA_HOST}/local/yard/react-home.js`;

const die = (m) => { console.error(`FAILED: ${m}`); process.exit(1); };

if (!existsSync(DIST)) die(`no build at ${DIST} — run npm run build first`);
if (!existsSync(TOKEN_FILE)) die(`no HA token at ${TOKEN_FILE}`);
const token = readFileSync(TOKEN_FILE, 'utf8').trim();

// A stale dist is the classic false success: you edit, forget to build, and
// publish yesterday's bundle. Warn if dist is older than the newest source.
if (!process.argv.includes('--skip-build-check')) {
  const distTime = statSync(DIST).mtimeMs;
  const srcDir = new URL('../src/', import.meta.url).pathname.replace(/^\//, '');
  const { execSync } = await import('node:child_process');
  const newest = execSync(`git log -1 --format=%ct -- "${srcDir}"`, { encoding: 'utf8' }).trim();
  if (Number(newest) * 1000 > distTime) {
    console.warn('WARNING: dist/ is older than the last commit under src/. Run npm run build.');
  }
}

// ---- 1. stage ---------------------------------------------------------
const bytes = readFileSync(DIST);
writeFileSync(STAGE, bytes);            // O_TRUNC, not unlink-and-recreate
console.log(`staged ${bytes.length} bytes -> ${STAGE}`);

// ---- 2. let HA copy it into www/ --------------------------------------
const res = await fetch(`http://${HA_HOST}/api/services/shell_command/publish_yard`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: '{}',
});
if (!res.ok) die(`publish_yard returned ${res.status}`);
console.log('publish_yard ok');

// ---- 3. bump the resource ---------------------------------------------
const newVersion = await new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://${HA_HOST}/api/websocket`);
  let id = 0;
  const pending = new Map();
  const send = (msg) => new Promise((r, j) => {
    const mid = ++id;
    pending.set(mid, { r, j });
    ws.send(JSON.stringify({ id: mid, ...msg }));
  });
  const timer = setTimeout(() => reject(new Error('websocket timeout')), 20000);

  ws.addEventListener('message', async (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === 'auth_required') return ws.send(JSON.stringify({ type: 'auth', access_token: token }));
    if (m.type === 'auth_invalid') { clearTimeout(timer); return reject(new Error('auth invalid')); }
    if (m.type === 'auth_ok') {
      try {
        const list = await send({ type: 'lovelace/resources/list' });
        const r = list.find((x) => (x.url || '').includes('react-home.js'));
        if (!r) throw new Error('react-home.js resource not registered');
        const [base, q] = r.url.split('?');
        const next = Number(new URLSearchParams(q || '').get('v') || 0) + 1;
        await send({ type: 'lovelace/resources/update', resource_id: r.id, res_type: r.type, url: `${base}?v=${next}` });
        clearTimeout(timer);
        ws.close();
        resolve(next);
      } catch (e) { clearTimeout(timer); reject(e); }
    }
    if (m.type === 'result') {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      m.success ? p.r(m.result) : p.j(new Error(JSON.stringify(m.error)));
    }
  });
  ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('websocket error')); });
});
console.log(`resource bumped -> ?v=${newVersion}`);

// ---- 4. prove it ------------------------------------------------------
// Byte-compare rather than grep for a marker: this catches a partial copy or
// a stale cache without needing to know what changed.
const servedBody = Buffer.from(await (await fetch(SERVED, { cache: 'no-store' })).arrayBuffer());
if (servedBody.length !== bytes.length) {
  die(`served ${servedBody.length} bytes but built ${bytes.length} — the copy did not land`);
}
if (!servedBody.equals(bytes)) die('served bundle differs from the build');
console.log(`VERIFIED: ${servedBody.length} bytes served, identical to the build`);
