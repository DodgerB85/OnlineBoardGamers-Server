# Generated manually on 2026-01-16

import random
from django.db import migrations


def migrate_cns_games(apps, schema_editor):
    """
    Migrate all CNS_Game instances to the new unified Game model with gameCode='CNS'
    """
    # Get models - use apps.get_model to get the historical version
    CNS_Game = apps.get_model("CNS", "CNS_Game")
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")
    User = apps.get_model("Lobby", "User")

    # Get all CNS games
    cns_games = CNS_Game.objects.all().prefetch_related(
        "allPlayers",
        "missingPlayers",
        "kickedPlayers",
        "invitedPlayers",
        "playersWithChatNotification",
    )

    print(f"\nMigrating {cns_games.count()} CNS games to unified Game model...")

    migrated_count = 0

    for cns_game in cns_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode="CNS",
            original_id=cns_game.id,
            # Copy BaseGame fields
            gameName=cns_game.gameName,
            gameDescription=cns_game.gameDescription,
            gameStatus=cns_game.gameStatus,
            playerOrderSeed=cns_game.playerOrderSeed,
            maxPlayers=cns_game.maxPlayers,
            turn=cns_game.turn,
            phase=cns_game.phase,
            kickoutDuration=cns_game.kickoutDuration,
            gamePace=cns_game.gamePace,
            chatData=cns_game.chatData,
            gameData=cns_game.gameData,
            rewindData=cns_game.rewindData,
            rewindTempData=cns_game.rewindTempData,
            kickoutFlexiData=cns_game.kickoutFlexiData,
            statsExcludedGame=cns_game.statsExcludedGame,
            zoomLevels=cns_game.zoomLevels,
            latestUpdate=cns_game.latestUpdate,
            created=cns_game.created,
            startingMap=cns_game.startingMap,
            startingOptions=cns_game.startingOptions,
            statsExcludeConsent=cns_game.statsExcludeConsent,
            deleteGameVotes=cns_game.deleteGameVotes
            if hasattr(cns_game, "deleteGameVotes")
            else None,
            activeVotes=cns_game.activeVotes
            if hasattr(cns_game, "activeVotes")
            else None,
            # Copy foreign keys
            creator=cns_game.creator,
            host=cns_game.host,
        )

        # Copy invited players M2M
        new_game.invitedPlayers.set(cns_game.invitedPlayers.all())

        # Get all players and build a mapping for seat order
        all_players = list(cns_game.allPlayers.all())
        missing_players_set = set(cns_game.missingPlayers.all())
        kicked_players_set = set(cns_game.kickedPlayers.all())
        chat_notification_players_set = set(cns_game.playersWithChatNotification.all())

        # Determine seat order using playerOrderSeed (same logic as CNS_Game)
        # Shuffle players with the same seed to maintain seat order
        if cns_game.playerOrderSeed > 0:
            player_list = all_players.copy()
            random.Random(cns_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players

        # Determine current player(s)
        current_players_str = cns_game.currentPlayers
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            current_players_usernames = {
                cp.strip() for cp in current_players_str.split(",") if cp.strip()
            }

        # Determine winner
        winner_user = cns_game.winner if hasattr(cns_game, "winner") else None

        # Create GamePlayer instances for each player
        game_players = []
        for idx, player in enumerate(player_list):
            is_missing = player in missing_players_set
            is_kicked = player in kicked_players_set
            is_current = player.username in current_players_usernames
            has_chat_notification = player in chat_notification_players_set
            is_winner = (winner_user == player) if winner_user else False

            # Get player notes if they exist
            notes = ""
            player_seat = idx
            if player_seat == 0 and hasattr(cns_game, "player0notes"):
                notes = cns_game.player0notes
            elif player_seat == 1 and hasattr(cns_game, "player1notes"):
                notes = cns_game.player1notes
            elif player_seat == 2 and hasattr(cns_game, "player2notes"):
                notes = cns_game.player2notes
            elif player_seat == 3 and hasattr(cns_game, "player3notes"):
                notes = cns_game.player3notes

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

    print(f"Successfully migrated {migrated_count} CNS games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated CNS games from the unified Game model
    """
    Game = apps.get_model("Lobby", "Game")

    # Delete all CNS games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode="CNS").count()
    Game.objects.filter(gameCode="CNS").delete()

    print(f"Removed {deleted_count} CNS games from unified Game model")


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0057_add_gameplayer_fields"),
        ("CNS", "0001_initial"),  # Ensure CNS app is available
    ]

    operations = [
        migrations.RunPython(migrate_cns_games, reverse_migration),
    ]
