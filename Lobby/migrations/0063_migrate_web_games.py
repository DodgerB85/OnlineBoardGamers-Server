# Generated manually on 2026-01-24

import random
from django.db import migrations


def migrate_web_games(apps, schema_editor):
    """
    Migrate all WEB_Game instances to the new unified Game model with gameCode='WEB'
    """
    # Get models - use apps.get_model to get the historical version
    WEB_Game = apps.get_model("WEB", "WEB_Game")
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")
    User = apps.get_model("Lobby", "User")

    # Get all WEB games
    web_games = WEB_Game.objects.all().prefetch_related(
        "allPlayers",
        "missingPlayers",
        "kickedPlayers",
        "invitedPlayers",
        "playersWithChatNotification",
        "winner",
    )

    print(f"\nMigrating {web_games.count()} WEB games to unified Game model...")

    migrated_count = 0

    for web_game in web_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode="WEB",
            original_id=web_game.id,
            # Copy BaseGame fields
            gameName=web_game.gameName,
            gameDescription=web_game.gameDescription,
            gameStatus=web_game.gameStatus,
            playerOrderSeed=web_game.playerOrderSeed,
            maxPlayers=web_game.maxPlayers,
            turn=web_game.turn,
            phase=web_game.phase,
            kickoutDuration=web_game.kickoutDuration,
            gamePace=web_game.gamePace,
            chatData=web_game.chatData,
            gameData=web_game.gameData,
            rewindData=web_game.rewindData,
            rewindTempData=web_game.rewindTempData,
            kickoutFlexiData=web_game.kickoutFlexiData,
            statsExcludedGame=web_game.statsExcludedGame,
            zoomLevels=web_game.zoomLevels,
            latestUpdate=web_game.latestUpdate,
            created=web_game.created,
            startingMap=web_game.startingMap
            if hasattr(web_game, "startingMap")
            else "",
            startingOptions=web_game.startingOptions,
            statsExcludeConsent=web_game.statsExcludeConsent
            if hasattr(web_game, "statsExcludeConsent")
            else None,
            deleteGameVotes=web_game.deleteGameVotes
            if hasattr(web_game, "deleteGameVotes")
            else None,
            activeVotes=web_game.activeVotes
            if hasattr(web_game, "activeVotes")
            else None,
            # Copy foreign keys
            creator=web_game.creator,
            host=web_game.host,
        )

        # Copy invited players M2M
        new_game.invitedPlayers.set(web_game.invitedPlayers.all())

        # Get all players and build a mapping for seat order
        all_players = list(web_game.allPlayers.all())
        missing_players_set = set(web_game.missingPlayers.all())
        kicked_players_set = set(web_game.kickedPlayers.all())
        chat_notification_players_set = set(web_game.playersWithChatNotification.all())
        winner_players_set = set(web_game.winner.all())

        # Determine seat order using playerOrderSeed (same logic as WEB_Game)
        # Shuffle players with the same seed to maintain seat order
        if web_game.playerOrderSeed > 0:
            player_list = sorted(all_players, key=lambda p: p.username)
            random.Random(web_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players

        # Determine current player(s)
        current_players_str = web_game.currentPlayers
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            current_players_usernames = {
                cp.strip() for cp in current_players_str.split(",") if cp.strip()
            }

        # Create GamePlayer instances for each player
        game_players = []
        for idx, player in enumerate(player_list):
            is_missing = player in missing_players_set
            is_kicked = player in kicked_players_set
            is_current = player.username in current_players_usernames
            has_chat_notification = player in chat_notification_players_set
            is_winner = player in winner_players_set

            # Get player notes if they exist
            notes = ""
            player_seat = idx
            if player_seat == 0 and hasattr(web_game, "player0notes"):
                notes = web_game.player0notes
            elif player_seat == 1 and hasattr(web_game, "player1notes"):
                notes = web_game.player1notes
            elif player_seat == 2 and hasattr(web_game, "player2notes"):
                notes = web_game.player2notes
            elif player_seat == 3 and hasattr(web_game, "player3notes"):
                notes = web_game.player3notes

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

    print(f"Successfully migrated {migrated_count} WEB games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated WEB games from the unified Game model
    """
    Game = apps.get_model("Lobby", "Game")

    # Delete all WEB games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode="WEB").count()
    Game.objects.filter(gameCode="WEB").delete()

    print(f"Removed {deleted_count} WEB games from unified Game model")


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0062_game_relatedmaintournament_and_more"),
        ("WEB", "0001_initial"),  # Ensure WEB app is available
    ]

    operations = [
        migrations.RunPython(migrate_web_games, reverse_migration),
    ]
