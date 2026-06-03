Run this from the repo root with your virtualenv active to perform all the tests

python manage.py test Lobby.sharedFunctions.tests Lobby.tests_middleware Lobby.tests_models

Local Linux venv shortcut:

.venv/bin/python manage.py test Lobby.sharedFunctions.tests Lobby.tests_middleware Lobby.tests_models


=== Test file summaries ===

test_sharedFunctions.py
  Tests for Lobby.sharedFunctions.sharedFunctions helpers.
  - TestSFgetTimeNow: returns a millisecond timestamp string.
  - TestSFgetRequiredExp: each game code returns its required expansions count; unknown defaults to 2.
  - TestSFupdateFlexiTime: flex-time tracking for slow/day kickouts; adds/updates entries only when outside the kickout grace period.
  - TestSFkickoutRequired: kickout logic for finished/shadow/AI games, blitz/12h/1-day timers, and hard kickout when flex time is exhausted.
  - TestSFgetSecondsToNextKickout: seconds remaining until next kickout for blitz, 12h, 1-day, and 2-day settings; negative when overdue.
  - TestSFserializeGame: serializes a game into a dict with player flags, invited players, elapsed time, and derived booleans (myMove, learningGame, etc.); handles missing players.
  - TestTournamentSharedFunctions: next-round game setup for Mini (HLC bye handling vs. non-HLC two-player games), multi-game top-14 seeding, and Two Lives end-game processing that removes players with no lives or who were kicked.
  - TestSharedGameCreationHelpers: player username validation (rejects missing and optionally the creator) and training-game shadow player setup from POST display names.

test_sharedNotifications.py
  Tests for Lobby.sharedFunctions.sharedNotifications.shouldSendEmail.
  - Rejects SHADOW / bot users and unconfirmed emails.
  - Suppresses "yourTurn" emails for live games.
  - Clears expired stop-email windows and respects future ones.
  - Each of the 11 email preferences can disable its matching notification type.
  - "yourTurnFactoryFix" bypasses preferences but still requires confirmed email.

test_sharedRefs.py
  Tests for Lobby.sharedFunctions.sharedRefs display / scoring helpers.
  - TestSRgetTimeNow: returns current time as a millisecond string.
  - TestSRisThisMultiiWinnersGame: KFW and AQY are multi-winner; others are not.
  - TestSRgetTournamentTypeDisplay: maps tournament type codes to human-readable names.
  - TestSRgetTournamentWinnerHTML: renders status banners for pending/open/private/in-progress, and finished tournaments with 1st/2nd/3rd place links (including multiple first-place winners and empty third place).
  - TestSRlatestUpdateElapsedTimeString: formats elapsed seconds into d/h/m/s strings.
  - TestSRgamePaceString: maps pace IDs to Live/Fast/Standard/Slow/Casual labels.
  - TestSRgetPointsForPosition: tournament points table for positions 1st-4th (and bye) across 2-6 player counts; invalid inputs return 0.
  - TestGetCleanedAndSortedRoundData: sorts round data by wins, then tie-breaker arrays, then alphabetically; strips negative-infinity padding.

test_tournyGenerator.py
  Tests for Lobby.sharedFunctions.tournyGenerator multi-game scheduling.
  - TestMultiGamePlayers4p: validates minimum-player errors; for 15+ players produces N 4-player games where every player plays exactly 4 games and no pair repeats.
  - TestMultiGamePlayersRound2: requires exactly 14 players; returns 14 games split into two groups of 7, each player plays 4 games within their group.

Lobby/tests_middleware.py
  Tests for Lobby.middleware.ForceTrailingSlashMiddleware.
  - Redirects all game-code paths, login, profile, and index URLs missing a trailing slash with HTTP 301.
  - Does not redirect when the slash is already present, for root "/", or for non-app paths like "/api/data".

Lobby/tests_models.py
  Tests for Lobby core models.
  - TestUserModel: __str__ includes username and an inactive-user marker.
  - TestProfileCreation: profile auto-created on user creation with expected defaults (sendEmailNotificationOnTurn=True, email_confirmed=False, showAssistance=True, etc.).
  - TestLockModel: is_expired() based on created_at age; __str__ returns lock name.
  - TestGameModel: creation defaults (status AVAILABLE, turn 0, kickout 200, pace 30, maxPlayers 2); __str__ includes gameCode and optional name; presenter and getGameCode work.
  - TestGamePlayerModel: creation defaults; unique (game, player) constraint enforced; default ordering by seat_order.
