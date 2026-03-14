# Generated manually on 2026-02-10

import random
import json
from django.db import migrations


def migrate_bus_games(apps, schema_editor):
    """
    Migrate all Bus_Game instances to the new unified Game model with gameCode='Bus'
    """
    # Get models - use apps.get_model to get the historical version
    Bus_Game = apps.get_model("Bus", "Bus_Game")
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    # Get all Bus games
    bus_games = Bus_Game.objects.all().prefetch_related(
        "allPlayers",
        "missingPlayers",
        "kickedPlayers",
        "invitedPlayers",
        "playersWithChatNotification",
        "relatedTournament",
    )

    print(f"\nMigrating {bus_games.count()} Bus games to unified Game model...")

    migrated_count = 0

    for bus_game in bus_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode="Bus",
            original_id=bus_game.id,
            # Copy BaseGame fields
            gameName=bus_game.gameName,
            gameDescription=bus_game.gameDescription,
            gameStatus=bus_game.gameStatus,
            playerOrderSeed=bus_game.playerOrderSeed,
            maxPlayers=bus_game.maxPlayers,
            turn=bus_game.turn,
            phase=bus_game.phase,
            kickoutDuration=bus_game.kickoutDuration,
            gamePace=bus_game.gamePace,
            chatData=bus_game.chatData,
            gameData=bus_game.gameData,
            rewindData=bus_game.rewindData,
            rewindTempData=bus_game.rewindTempData,
            kickoutFlexiData=bus_game.kickoutFlexiData,
            statsExcludedGame=bus_game.statsExcludedGame,
            zoomLevels=bus_game.zoomLevels,
            latestUpdate=bus_game.latestUpdate,
            created=bus_game.created,
            startingMap=bus_game.startingMap
            if hasattr(bus_game, "startingMap")
            else "",
            startingOptions=bus_game.startingOptions,
            statsExcludeConsent=bus_game.statsExcludeConsent,
            deleteGameVotes=bus_game.deleteGameVotes
            if hasattr(bus_game, "deleteGameVotes")
            else None,
            # Copy foreign keys
            creator=bus_game.creator,
            host=bus_game.host,
            # Bus-specific fields
            relatedBusTournament=bus_game.relatedTournament
            if hasattr(bus_game, "relatedTournament")
            else None,
            tournamentGame=bus_game.tournamentGame
            if hasattr(bus_game, "tournamentGame")
            else False,
        )

        # Copy invited players M2M
        new_game.invitedPlayers.set(bus_game.invitedPlayers.all())

        # Get all players and build a mapping for seat order
        all_players = list(bus_game.allPlayers.all())
        missing_players_set = set(bus_game.missingPlayers.all())
        kicked_players_set = set(bus_game.kickedPlayers.all())
        chat_notification_players_set = set(bus_game.playersWithChatNotification.all())

        # Determine seat order using playerOrderSeed (same logic as Bus_Game.getAllPlayersOrderedySeat)
        # Shuffle players with the same seed to maintain seat order
        if bus_game.playerOrderSeed > 0:
            player_list = all_players.copy()
            random.Random(bus_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players

        # Determine current player(s) from currentPlayers string
        # In Bus, currentPlayers is typically a single username but could be comma-separated
        current_players_str = (
            bus_game.currentPlayers if hasattr(bus_game, "currentPlayers") else ""
        )
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            # Also handle special values like SHADOW, SHADOW_2, etc.
            current_players_usernames = {
                cp.strip() for cp in current_players_str.split(",") if cp.strip()
            }

        # Determine winner
        winner_user = bus_game.winner if hasattr(bus_game, "winner") else None

        # Build rewind consent activeVotes from rewindConsent string
        rewind_consent_str = (
            bus_game.rewindConsent if hasattr(bus_game, "rewindConsent") else ""
        )
        rewind_votes = {}
        if rewind_consent_str:
            for idx, player in enumerate(player_list):
                if idx < len(rewind_consent_str):
                    try:
                        rewind_votes[player.username] = int(rewind_consent_str[idx])
                    except (ValueError, IndexError):
                        rewind_votes[player.username] = 0

        if rewind_votes:
            new_game.activeVotes = {"rewind_consent": rewind_votes}
            new_game.save()

        # Create GamePlayer instances for each player
        game_players = []
        for idx, player in enumerate(player_list):
            is_missing = player in missing_players_set
            is_kicked = player in kicked_players_set
            is_current = player.username in current_players_usernames
            has_chat_notification = player in chat_notification_players_set
            is_winner = (winner_user == player) if winner_user else False

            # Get player notes if they exist
            # Bus has player0notes through player4notes
            notes = ""
            player_seat = idx
            if player_seat == 0 and hasattr(bus_game, "player0notes"):
                notes = bus_game.player0notes or ""
            elif player_seat == 1 and hasattr(bus_game, "player1notes"):
                notes = bus_game.player1notes or ""
            elif player_seat == 2 and hasattr(bus_game, "player2notes"):
                notes = bus_game.player2notes or ""
            elif player_seat == 3 and hasattr(bus_game, "player3notes"):
                notes = bus_game.player3notes or ""
            elif player_seat == 4 and hasattr(bus_game, "player4notes"):
                notes = bus_game.player4notes or ""

            game_player = GamePlayer(
                game=new_game,
                player=player,
                seat_order=idx,
                is_missing=is_missing,
                is_kicked=is_kicked,
                is_current=is_current,
                has_chat_notification=has_chat_notification,
                winner=is_winner,
                notes=notes,
            )
            game_players.append(game_player)

        # Bulk create all GamePlayer instances
        GamePlayer.objects.bulk_create(game_players)

        migrated_count += 1
        if migrated_count % 100 == 0:
            print(f"  Migrated {migrated_count} games...")

    print(f"Successfully migrated {migrated_count} Bus games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated Bus games from the unified Game model
    """
    Game = apps.get_model("Lobby", "Game")

    # Delete all Bus games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode="Bus").count()
    Game.objects.filter(gameCode="Bus").delete()

    print(f"Removed {deleted_count} Bus games from unified Game model")


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0078_game_relatedbustournament"),
        ("Bus", "0023_bus_game_automoves"),  # Ensure Bus app is available
    ]

    operations = [
        migrations.RunPython(migrate_bus_games, reverse_migration),
    ]
