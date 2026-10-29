# Card #304: your comment in Testing or Uncommitted sends the card back to To Do

The change is in the **trello-agents** repo (the board daemon). Nothing in the shop changes.

## What changed

- `isChangeRequest()` in `trello-agents/src/stages.ts`: a comment on a card in 🤖 Testing or 🤖 Uncommitted asks for another build, unless it's empty or ends with `?`.
- `runJob` in `trello-agents/src/index.ts`: for such a comment the daemon moves the card to ✋ To Do and starts a build with the comment, continuing the card's build session. The card then goes Doing → Testing → Uncommitted as usual. A question gets a read-only chat answer and the card stays put.
- The daemon ignores its own move to To Do, so it doesn't start a second build.
- `trello-agents/README.md` ("Talking to an agent") describes the loop.
- Tests in `trello-agents/tests/stages.test.ts`.

## Why

Checking a card and asking for a change meant moving it back by hand. Now a comment is enough, so improvement rounds run on their own.

## How to test by hand

1. Restart the daemon once no agents are running (a restart stops them).
2. Comment "make the button bigger" on a card in Testing: it moves to To Do, then Doing, and the log shows the old build session resuming with your comment.
3. Comment "why is it blue?" on a card in Uncommitted: you get an answer and the card stays in Uncommitted.
4. Comment "Why is it blue? Make it red." on a card in Uncommitted: it goes back to To Do (only a `?` at the very end makes a question).
