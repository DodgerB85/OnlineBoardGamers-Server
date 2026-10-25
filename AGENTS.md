# AGENTS.md

## Taste — the Zen of Python (PEP 20)
Beautiful is better than ugly. Explicit is better than implicit.
Simple is better than complex. Complex is better than complicated.
Flat is better than nested. Sparse is better than dense. Readability counts.
Special cases aren't special enough to break the rules. Practicality beats purity.
Errors should never pass silently. Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one—and preferably only one—obvious way to do it.
Now is better than never. Although never is often better than right now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.

## Process — lazy senior dev
Best code is the code never written: solve the whole problem with the least new code.

Before writing: read the task and the code it touches. List everywhere the change must reach (callers, tests, templates, built frontend, docs) and what it could break (saved games, rewind stacks, notifications, other game apps). That is scope; extra features are not.

Smallest complete change — first option that fully works:
1. Does it need to exist? Skip unrequested features/options/flexibility; name them in one line.
2. Already in this codebase (see shared code below, or a sibling game's view)? Use it the way surrounding code does.
3. Standard library or platform feature? Use it, unless the project has its own.
4. An installed dependency? Use it. Never add one for a few lines.
5. One line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

Lazy about the solution, never about the change: finish every part the task needs, including the callers, tests and fixtures your change breaks.
No abstraction, wrapper, type conversion, option, config or "for later" code nobody asked for. Deletion beats addition.
Keep the structure and style the file already has. This repo is mixed-era and mixed-style by design: no mass reformatting, no renaming sweeps, no converting tabs to spaces.
Shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
Comment only the why the code cannot show, in one line.
Bug fix: grep every caller of the function you touch, then fix the root cause once in the shared code.
Code you move or merge keeps its error handling and validation.
Equal-size options: take the one that is correct on edge cases.
Non-trivial new logic (a branch, a loop, a parser, or a whole new endpoint) leaves one small test. Trivial changes need none.
A shortcut with a known limit gets: `shortcut: <the limit>, <when to upgrade>`.

## House rules — this project is deliberately "dumb server"
The client owns the rules: move generation, legality, replay, most gameplay flow. The server owns persistence, turn coordination, kickouts, notifications and the page shell. Never move game logic to the server because it looks cleaner. Fix a rule on the client.

Migrating the backend toward JS is a separate project. Do not advance it as a side quest.

A bug confined to one game gets fixed in that game. Do not generalize across game apps: the similarity is historical, the differences are load-bearing.

Shared code: `Lobby/presenters.py` (per-game game behavior), `Lobby/gameViewHelpers.py` (show-page setup, notes, votes, zoom, bug reports, `process_game_with_mutex`), `Lobby/sharedFunctions/` (notifications, refs, `db_mutex`, kickout maths, matchmaking). Extend there when the behavior is already shared.

Never cut:
- the user's request itself; validation at trust boundaries; security; error handling that prevents data loss.
- stale-write rejection: mutating endpoints compare the request `latestUpdate` against the DB value and reject the mismatch. Do not remove or reorder that check.
- the mutex: game-mutating views go through `process_game_with_mutex(request, handler, mutex_prefix=...)`. Do not bypass or unwrap it.
- save-before-notify ordering on turn endpoints, kickout/flexi-time bookkeeping, rewind handling, and presenter `endGame` cleanup (`clearGeneralDataOnGameEndWithoutSave`).
- legacy data shapes. They differ per game on purpose and old games are still loaded:
  - `zoomLevels` is JSON in most games, a fixed-width string in older FCM code
  - `chatData` may be gzip+base64 or `lzstring`
  - `rewindData` has newer JSON-array handling plus legacy compatibility shims
  - old URLs resolve through `original_id`; those redirects must keep working for games that have no `original_id`
  Never assume one game's storage format applies to another. Never migrate a field's format during a small task.
- `gettext` on user-facing strings.
- the closest existing test when you touch a covered flow.

## Build and test traps
Prefer JPG for image assets when possible; compression saves space.
Frontend source is `<GAME>/vue<GAME>/src`. `<GAME>/static/<GAME>/<GAME>vuedist` is build output: never edit it by hand, and never include dist/build output in a commit.
`npm run build` leaves a stray `images/` dir in the dist folder (RNB also `help/`); delete it after building. The `<game>.bat` scripts hardcode the maintainer's Windows paths and don't run here.
Backend tests: root `/tests/test_*.py`, plain `unittest`, `manage.py test tests.test_x`. No pytest, no per-app `tests.py`. Frontend tests: vitest `src/**/*.test.js`, `npm test`, only FCM, IND, ROW.
If you change behavior described in `/docs/`, update that doc.

End each reply with one or two lines: what you skipped or did not check, and any risk the user must know.
