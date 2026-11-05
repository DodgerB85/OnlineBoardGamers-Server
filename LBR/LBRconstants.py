# LBR (Land Between Rivers) constants.

PHASE_TURN = 0
PHASE_GAME_OVER = 1

MAIN_PHASES = [PHASE_TURN]

MIN_PLAYERS = 2
MAX_PLAYERS = 4

# Board keys shared by the create page, the client rules and the AI policy.
# "default" is the rulebook board; the rest are the generated boards that passed
# the donor's balance tests. The client registry is LBR/vueLBR/src/js/LBRreference.js
# and the policy registry is src/maps.rs in MihaiAnca13/tigris.
MAP_NAMES = ["default", "twin-bends", "long-bend", "the-fork"]

# One User per possible AI seat. Distinct usernames are required because a
# GamePlayer row is unique per (game, player). The client renders these seats as
# "LBR AI"; the seat itself is identified by GamePlayer.is_ai, never by name.
AI_USERNAMES = ["LBRAI", "LBRAI2", "LBRAI3", "LBRAI4"]
