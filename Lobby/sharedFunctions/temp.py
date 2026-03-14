import random


def create_game_schedule(players, max_retries=1000):
    """
    Creates a game schedule for a given list of players, ensuring that:
    - Each player plays 4 games.
    - No two players meet in the same game more than once.

    Args:
        players: A list of player names (strings).
        max_retries: Maximum number of attempts to create a valid game.

    Returns:
        A list of games, where each game is a list of player names.
        Returns None if a valid schedule cannot be generated.
    """

    num_players = len(players)
    if num_players < 15:
        raise ValueError("This function is designed for 15 or more players.")

    num_games_per_player = 4
    games = []
    player_games = {player: [] for player in players}  # Track games each player is in
    player_pairings = {
        player: set() for player in players
    }  # Track who each player has played with

    def is_valid_game(potential_game):
        """
        Checks if a potential game is valid, meaning:
        - No player is in the game twice.
        - No two players have played together before.
        """
        if len(set(potential_game)) != len(potential_game):
            return False  # Duplicate players in the game

        for i in range(len(potential_game)):
            for j in range(i + 1, len(potential_game)):
                if potential_game[j] in player_pairings[potential_game[i]]:
                    return False  # These two players have already played together
        return True

    def add_game(game):
        """
        Adds a game to the schedule and updates player_games and player_pairings.
        """
        games.append(game)
        for player in game:
            player_games[player].append(len(games) - 1)  # Store the game index
            for other_player in game:
                if player != other_player:
                    player_pairings[player].add(other_player)

    def remove_last_game():
        """
        Removes the last game added to the schedule and reverts player_games and player_pairings.
        This is used for backtracking when a valid schedule cannot be found.
        """
        if not games:
            return

        last_game = games.pop()
        for player in last_game:
            player_games[player].pop()  # Remove the last game index
            for other_player in last_game:
                if player != other_player:
                    player_pairings[player].remove(other_player)

    # Algorithm:  Iterate through players and create games for each
    for player in players:
        retries = 0
        while len(player_games[player]) < num_games_per_player:
            if retries > max_retries:
                # Backtrack: remove the last game and try again from there
                if games:
                    remove_last_game()
                    # Reset the current player's game count, and restart the loop from the beginning of the players list
                    # This is a simplified backtracking approach. A more sophisticated approach might involve
                    # trying different game sizes or player combinations.
                    player_games[player] = []
                    for p in players:
                        if len(player_games[p]) < num_games_per_player:
                            player = p
                            break  # Restart with a player that needs more games
                    else:
                        # If all players have the required number of games, but we still have games to generate,
                        # it means there's no valid schedule with the current constraints.
                        print(
                            "Warning: Could not generate a valid schedule after backtracking."
                        )
                        return None
                    retries = 0  # Reset retries after backtracking
                    continue  # Restart the outer loop

                else:
                    print("Warning: Could not generate a valid schedule.")
                    return None

            # Find potential players for the game
            eligible_players = [
                p
                for p in players
                if p != player
                and len(player_games[p]) < num_games_per_player
                and p not in player_pairings[player]
            ]

            if not eligible_players:
                retries += 1
                continue  # Retry

            # Determine the game size.  We'll aim for games of 3-5 players.
            game_size = random.randint(
                3, min(5, len(eligible_players) + 1)
            )  # +1 to account for the original player

            # Create a potential game
            potential_game = [player] + random.sample(eligible_players, game_size - 1)

            if is_valid_game(potential_game):
                add_game(potential_game)
                retries = 0  # Reset retries on success
            else:
                retries += 1  # Increment retries on failure
                continue  # Retry with a different set of players

    # Verification (optional, but good practice)
    for player in players:
        if len(player_games[player]) != num_games_per_player:
            print(f"Error: Player {player} did not get the required number of games.")
            return None

    for player in players:
        for other_player in players:
            if player != other_player:
                count = 0
                for game in games:
                    if player in game and other_player in game:
                        count += 1
                if count > 1:
                    print(
                        f"Error: {player} and {other_player} played together {count} times."
                    )
                    return None

    return games


# Example Usage:
num_players = 15
player_list = [f"Player {i + 1}" for i in range(num_players)]

schedule = create_game_schedule(player_list)

if schedule:
    print("Game Schedule:")
    for i, game in enumerate(schedule):
        print(f"Game {i + 1}: {game}")
else:
    print("Could not generate a valid game schedule.")
