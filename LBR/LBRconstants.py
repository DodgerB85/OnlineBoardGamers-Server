# LBR (Land Between Rivers) constants.

PHASE_TURN = 0
PHASE_GAME_OVER = 1

MAIN_PHASES = [PHASE_TURN]

MIN_PLAYERS = 2
MAX_PLAYERS = 4

# One User per possible AI seat. Distinct usernames are required because a
# GamePlayer row is unique per (game, player). The client renders these seats as
# "Tigris AI"; the seat itself is identified by GamePlayer.is_ai, never by name.
AI_USERNAMES = ["TigrisAI", "TigrisAI2", "TigrisAI3", "TigrisAI4"]
