# Card #257: a calm Claude Code workspace

Workspace setup, not shop code. Nothing in this repo changes except this note.

## What changed

- **Ghostty** (`~/.config/ghostty/config`): 17 pt text, 15% taller lines, the soft "Everforest Dark Hard" theme, a fully opaque window and a cursor that doesn't blink. The grid background picture and the glow/cursor shaders are off. The neon setup is saved as `config.bak-257`.
- **Claude Code** (`~/.claude/settings.json`): theme `dark-ansi`, so Claude uses Ghostty's colors. Backup: `settings.json.bak-257`.
- **Short replies:** the workspace `AGENTS.md` has a "Replies" rule: a few plain sentences, no commands or code unless asked, and a finished task ends with 2–4 lines.
- **Video pops up when work is done:**
  - A Stop hook (`~/.claude/hooks/open-new-video.py`) checks `~/Videos/changes` after every Claude reply. If a video is newer than the last one it opened, it opens the review page `http://localhost:4500/#card-<n>`, or the file itself when the review page isn't running. On its first run it only remembers the newest video, so old videos never pop up.
  - The trello-agents daemon opens the review page link for a card when its review stage finishes with a video (`openInBrowser` in `src/notify.ts`).

## Why

The neon terminal and long replies made working with Claude tiring. Watching a short video is easier than reading through the details.

## How to test by hand

1. In Ghostty, press Ctrl+Shift+, to reload: the text is larger and the colors are soft and warm.
2. WebStorm terminal (set by hand): Settings → Editor → Color Scheme → Console Font, size 17, line height 1.2.
3. Save any `card-<n>-test.webm` into `~/Videos/changes`, then send Claude a short message. When it answers, the review page opens on that card (or the file opens). Send another message and nothing opens again. Delete the test file afterwards.
4. Restart the trello-agents daemon. After the next card's review stage ends with a video, the review page opens by itself.
5. Undo: copy the `.bak-257` files back.
