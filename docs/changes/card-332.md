# Card #332: A rebuilt card is never "already committed"

## What changed

- The fix is in the **trello-agents** repo, not in this shop: `src/index.ts` (`runJob`) clears the card's saved `commitHash` when a build run starts.
- `commitCard` (`src/ship.ts`) skips the squash when the saved hash is already on the target branch. After a rebuild that hash is gone, so the new work is squashed into `main` again.
- This shop-baifo branch only carries this note.

## Why

A card that was committed, sent back to To Do with feedback and rebuilt kept its old commit hash. On Committed the daemon said "Already committed", pushed `main` without the new work and deleted the branch. That is how #297's spacing got lost (recovered from `51d0303`).

## How to test by hand

1. Commit the two lines in trello-agents `src/index.ts` and restart the daemon.
2. Take a card that was already committed, send it back to To Do and let it rebuild.
3. Move it to Committed: the comment says "Committed as …" with a new hash, not "Already committed", and the new work is on `main`.

Not covered: edits made by hand in a worktree after a commit, without a new build run.
