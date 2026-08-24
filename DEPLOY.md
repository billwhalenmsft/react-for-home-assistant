# Deploying

**Just push.** `git push origin main` triggers the pipeline (watcher on the NAS side):
pull → build → copy to `www/yard/react-home.js` → resource bump. Live in ~20 s.

Verify a deploy actually carried your change (browsers lie, caches lie):
`curl -s .../local/yard/react-home.js | grep -c "<some string unique to your change>"`

History: before the pipeline existed, the desktop session could NOT write www/
(container-owned over SMB) and deploys were manual scp relays. That era is over —
but the byte-verify habit stays, because an unpushed commit deploys *the old tip*
and looks exactly like success.
