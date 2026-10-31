# Eclipse (ECL) integration

Eclipse is not implemented as a normal OBG game. The Discord bot owns the rules,
saves, Discord channels, draft and history. OBG owns accounts, the lobby, game
creation/joining and the game page. The browser only talks to OBG; OBG forwards
game API requests to the bot over WireGuard.

```
browser ──► OBG Django /ECL/<game_id>/... ──► WireGuard ──► bot aiohttp :8099
                    │                                       │
                    └── OBG session + Discord seat            └── Eclipse engine + saves
                                                                 + Discord channels
```

## What lives where

| Thing | Owner | Notes |
| --- | --- | --- |
| Accounts, login, lobby, invites | OBG | normal `Game` / `GamePlayer` rows |
| Game state, saves, button feed, history | Discord bot | never written by OBG |
| Discord channels, draft, role | Discord bot | created when the OBG game starts |
| `aebN` external id | OBG | `ECL.ECLgameLink`, one per OBG game |
| Stats and history pages | Discord bot | the page's History dialog and combat rooms are the bot feed |
| Turn submission / rules | Discord bot | OBG never accepts a move |

`Game.gameData` stays empty. Nothing in `Game` is decoded as an Eclipse save.

## Lifecycle

1. `Lobby/createECLpage/` renders `Lobby/createECL.html`.
2. `ECL/common.py::create_ecl_game` validates invites with `SF_validatePlayers`
   and requires every player (creator included) to have `Profile.discord_id`.
   It creates a `WAITING`/`AVAILABLE`/`PRIVATE` OBG game and one
   `ECLgameLink` row with an empty external id.
3. Invitees join through the normal lobby (`joinGame`), which creates a
   `GamePlayer`. The last join calls `ECLpresenter.startGame`.
4. `ECLpresenter.startGame` posts the ordered Discord IDs to the bot's
   `POST /api/obg/games` using the shared secret. The bot creates the game,
   Discord category/role/channels, tech/outer-rim setup and faction draft, then
   returns `{id, tabletalk_url, actions_url}`. OBG stores the external id and
   marks the game `ACTIVE`.
5. `ECL/<game_id>/show/` renders the table and points the JS at
   `ECL/<game_id>/api/...` and `ECL/<game_id>/static/...` / `art/...`.
6. `ECL/views.py::proxy` binds the OBG session to the player's Discord id,
   forwards the request over WireGuard and returns the bot response. It never
   accepts a client-supplied seat for a player.
7. When the bot reports `game.ended`, the proxy marks the OBG game `FINISHED`
   and records winners so the lobby is accurate.

## Bot API contract

The bot listens on the WireGuard interface (for example `10.10.0.2:8099`).
`webui_host` in the bot `config.json` must be that address, not `0.0.0.0`.

`POST /api/obg/games` — server-to-server only:

```http
X-OBG-Token: <obg_shared_secret>
Content-Type: application/json
```

```json
{
  "name": "Friday night",
  "players": [{"discord_id": "123", "name": "alice"}],
  "player_count": 2,
  "ai_ship_type": "def",
  "rift_cannon": true,
  "turn_order_variant": true,
  "galactic_event_tiles": false,
  "hyperlanes": false,
  "community_parts": false,
  "community_rep_mod": false,
  "ban_factions": false,
  "alliances": false,
  "community_factions": false
}
```

Response `201`: `{"id": "aeb17", "tabletalk_url": "...", "actions_url": "..."}`.
Invalid input: `400`. Secret missing or wrong: `401`/`503`.

Player requests use the existing webui endpoints (`/api/games/...`,
`/art/...`, `/static/...`). The proxy is the only network path; the bot API
stays on the WireGuard interface and is not public.

## OBG configuration

Set these in the OBG `.env` (production) or local environment:

```dotenv
ECL_BOT_URL=http://10.10.0.2:8099
ECL_BOT_SECRET=same-value-as-obg_shared_secret-in-the-bot
```

Bot `config.json`:

```json
{
  "webui_host": "10.10.0.2",
  "webui_port": 8099,
  "guild_id": 1254475918873985094,
  "obg_shared_secret": "same-value"
}
```

Keep the bot's own `webui_require_login` false in this mode: OBG owns the user
session and the bot API is reachable only from the OBG host. Run
`collectstatic` in OBG for the ECL icon and box artwork. The bot's JS/CSS are
served through the proxy, so the frontend has one source of truth.

## Security

- The OBG proxy is login-only and only exposes the allowlisted bot paths for
  the game id in the URL.
- For a player, the proxy rewrites `seat` to their `Profile.discord_id` in both
  the query string and the JSON body. A player cannot act as another seat.
- A game admin or spectator has no seat and gets the bot's read-only view.
  They can watch, but cannot act: acting requires the player's Discord id.
- The bot's `POST /api/obg/games` requires the shared secret. Keep both hosts
  on the WireGuard network and do not expose port 8099 publicly.
- Discord ids are validated against the configured Discord guild before the
  bot creates any channel.

## Deliberately not included

- OBG tournaments, practice/shadow games, OBG stats pages and AutoSiteSweeper
  for ECL. The bot and Discord own those game flows. Abandoned WAITING/AVAILABLE
  Eclipse lobby games are therefore not swept automatically.
- OBG chat/notes/zoom/votes endpoints and OBG turn/kickout notifications.
  Game chat, history, turn pings and timeouts are in the bot and Discord.
- Push updates. The page polls the bot through the proxy like the standalone
  web UI.
- A Vue rewrite. The Django template reuses the bot's JS/CSS through the proxy.

## Known issues (review 2026-10-31)

Kickout, reminder and status handling, found in review and not yet fixed:

1. **Game creation fails on MySQL.** `ECL/common.py` sets `kickoutDuration = "100000"`
   to disable kickouts, but the field is a `PositiveSmallIntegerField` (max 32767).
   Production MySQL runs `STRICT_TRANS_TABLES`, so the insert errors. Tests use
   SQLite and miss it. A value like 30000 (300 days) fits.
2. **Turn state is synced only on page view.** `_sync_status` in `ECL/views.py`
   updates `is_current`, round and game end only when someone loads the table.
   Lobby "my turn", "next game" and turn nudges are stale until then.
3. **`latestUpdate` never moves after start.** Moves happen in the bot, so
   `Auto24HourTimeoutSummary2.py` (which runs for every game code) emails
   current ECL players "N days since last move" on days 1-6 after the *start*,
   regardless of real moves, then never again.
4. **Streaks never count ECL turns**, for the same reason as 3.
5. ECL is not in `AutoTurnReminder.py` or `AutoSiteSweeper.py` and kickouts are
   effectively off. Intended (the bot pings in Discord), but abandoned ECL games
   stay ACTIVE in OBG forever.
6. Game end is recorded only on page view and sets only FINISHED and winners.
   No ratings or stats, which matches "stats live in the bot".

Suggested fix for 2-4: have the bot notify OBG on turn change, or add a small
cron that pulls each ACTIVE ECL game's view and runs `_sync_status`, which
should also bump `latestUpdate` when the bot's state changes.
