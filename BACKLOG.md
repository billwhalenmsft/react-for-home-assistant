# Backlog

Ideas waiting for a slot, newest first. Each one says why it matters and what "done" looks like.

## Print queue: Bambu integration (added 2026-10-20)

**Today:** `todo.print_queue` is a plain HA to-do list. The Printers page shows it sorted by due date, with a Next-up card per printer. The printer is a title tag, `· X1C` or `· H2D`.

**Why:** Bill wants the queue to drive the printers, not just remind him. The friction is in the step from "next up" to "plate loaded and sent".

**Ideas:**
- **Bambu Farm Manager** (Bambu's free Windows app) keeps a real LAN print queue across both printers. Look at whether HA can read it, or feed it.
- **Pre-built plates per printer:** each queue item points at a 3MF that is already laid out and profiled for its machine. That covers bed size (X1C 256 mm, H2D 350×320), AMS slots, nozzle and the recommended process preset. Store the paths in the item description, with a link to open each in Bambu Studio.
- **Recommended setup per print:** pick X1C or H2D from bed fit, colour count and material (TPU from the external spool). Show it on the card.
- **MakerWorld capture:** a bookmark or share link adds the model to the queue with its print profile.
- **Job identity:** the bambu_lab integration only exposes the task name. If LAN-only / Developer mode is turned on, "reprint" can become a direct link instead of a search.

**Done when:** an idle printer's Next-up card has a one-tap path to the right, already-sliced job for that printer.

**Not wanted:** nudges or idle-printer phone alerts. Bill said no on 2026-10-20.
