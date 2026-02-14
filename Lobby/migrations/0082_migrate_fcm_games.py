# Generated manually on 2026-02-11

import random
import json
from django.db import migrations


def migrate_fcm_games(apps, schema_editor):
    """
    Migrate all FCM_Game instances to the new unified Game model with gameCode='FCM'
    """
    FCM_Game = apps.get_model('FCM', 'FCM_Game')
    Game = apps.get_model('Lobby', 'Game')
    GamePlayer = apps.get_model('Lobby', 'GamePlayer')

    fcm_games = FCM_Game.objects.all().prefetch_related(
        'allPlayers',
        'missingPlayers',
        'kickedPlayers',
        'invitedPlayers',
        'playersWithChatNotification',
        'relatedTournament',
        'relatedMainTournament',
        'relatedMiniTournament',
    )

    print(f"\nMigrating {fcm_games.count()} FCM games to unified Game model...")

    migrated_count = 0

    for fcm_game in fcm_games:
        new_game = Game.objects.create(
            gameCode='FCM',
            original_id=fcm_game.id,

            # Copy BaseGame fields
            gameName=fcm_game.gameName,
            gameDescription=fcm_game.gameDescription,
            gameStatus=fcm_game.gameStatus,
            playerOrderSeed=fcm_game.playerOrderSeed,
            maxPlayers=fcm_game.maxPlayers,
            turn=fcm_game.turn,
            phase=fcm_game.phase,
            kickoutDuration=fcm_game.kickoutDuration,
            gamePace=fcm_game.gamePace,
            chatData=fcm_game.chatData,
            gameData=fcm_game.gameData,
            rewindData=fcm_game.rewindData,
            rewindTempData=fcm_game.rewindTempData,
            kickoutFlexiData=fcm_game.kickoutFlexiData,
            statsExcludedGame=fcm_game.statsExcludedGame,
            zoomLevels=fcm_game.zoomLevels,
            latestUpdate=fcm_game.latestUpdate,
            created=fcm_game.created,
            startingMap=fcm_game.startingMap if hasattr(fcm_game, 'startingMap') else "",
            startingOptions=fcm_game.startingOptions,
            statsExcludeConsent=fcm_game.statsExcludeConsent,
            deleteGameVotes=fcm_game.deleteGameVotes if hasattr(fcm_game, 'deleteGameVotes') else None,
            activeVotes=fcm_game.activeVotes if hasattr(fcm_game, 'activeVotes') else None,
            autoMoves=fcm_game.autoMoves if hasattr(fcm_game, 'autoMoves') else None,

            # Copy foreign keys
            creator=fcm_game.creator,
            host=fcm_game.host,

            # FCM-specific fields
            FCMplayersMoveData=fcm_game.playersMoveData or "",
            FCMnotificationSuppression=fcm_game.notificationSuppression or "000000",
            relatedFCMTournament=fcm_game.relatedTournament if hasattr(fcm_game, 'relatedTournament') else None,
            relatedMainTournament=fcm_game.relatedMainTournament if hasattr(fcm_game, 'relatedMainTournament') else None,
            relatedMiniTournament=fcm_game.relatedMiniTournament if hasattr(fcm_game, 'relatedMiniTournament') else None,

            tournamentGame=fcm_game.tournamentGame if hasattr(fcm_game, 'tournamentGame') else False,
        )

        # Copy invited players M2M
        new_game.invitedPlayers.set(fcm_game.invitedPlayers.all())

        # Get all players and build a mapping for seat order
        all_players = list(fcm_game.allPlayers.all())
        missing_players_set = set(fcm_game.missingPlayers.all())
        kicked_players_set = set(fcm_game.kickedPlayers.all())
        chat_notification_players_set = set(fcm_game.playersWithChatNotification.all())

        # Determine seat order using the correct algorithm based on created timestamp
        # USE_NEW_CODE: created > 1744974000000 -> use random.shuffle
        # OLD CODE: use rotation algorithm
        USE_NEW_CODE = int(fcm_game.created) > 1744974000000

        # Build player list excluding FCMtourneyAdmin
        player_list_for_ordering = [
            p for p in all_players if p.username != "FCMtourneyAdmin"
        ]
        fcm_tourney_admin = [
            p for p in all_players if p.username == "FCMtourneyAdmin"
        ]

        if USE_NEW_CODE:
            # New code: shuffle with seed
            if fcm_game.playerOrderSeed > 0:
                random.Random(fcm_game.playerOrderSeed).shuffle(player_list_for_ordering)
        else:
            # Old code: rotation algorithm
            if fcm_game.playerOrderSeed > 0:
                for i in range(fcm_game.playerOrderSeed):
                    player_list_for_ordering.append(player_list_for_ordering.pop(0))

        # Add FCMtourneyAdmin at the end if present
        player_list_for_ordering.extend(fcm_tourney_admin)

        # Determine current player(s) from currentPlayers string
        current_players_str = fcm_game.currentPlayers if hasattr(fcm_game, 'currentPlayers') else ""
        current_players_usernames = set()
        if current_players_str:
            current_players_usernames = {cp.strip() for cp in current_players_str.split(',') if cp.strip()}

        # Determine winner
        winner_user = fcm_game.winner if hasattr(fcm_game, 'winner') else None

        # Create GamePlayer instances for each player
        game_players = []
        for idx, player in enumerate(player_list_for_ordering):
            is_missing = player in missing_players_set
            is_kicked = player in kicked_players_set
            is_current = player.username in current_players_usernames
            has_chat_notification = player in chat_notification_players_set
            is_winner = (winner_user == player) if winner_user else False

            # Get player notes
            # FCM has player0notes through player5notes (from GeneralGame + FCM_Game)
            notes = ""
            player_seat = idx
            if player_seat == 0 and hasattr(fcm_game, 'player0notes'):
                notes = fcm_game.player0notes or ""
            elif player_seat == 1 and hasattr(fcm_game, 'player1notes'):
                notes = fcm_game.player1notes or ""
            elif player_seat == 2 and hasattr(fcm_game, 'player2notes'):
                notes = fcm_game.player2notes or ""
            elif player_seat == 3 and hasattr(fcm_game, 'player3notes'):
                notes = fcm_game.player3notes or ""
            elif player_seat == 4 and hasattr(fcm_game, 'player4notes'):
                notes = fcm_game.player4notes or ""
            elif player_seat == 5 and hasattr(fcm_game, 'player5notes'):
                notes = fcm_game.player5notes or ""

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

    print(f"Successfully migrated {migrated_count} FCM games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated FCM games from the unified Game model
    """
    Game = apps.get_model('Lobby', 'Game')

    # Delete all FCM games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode='FCM').count()
    Game.objects.filter(gameCode='FCM').delete()

    print(f"Removed {deleted_count} FCM games from unified Game model")


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0081_game_fcm_fields'),
        ('FCM', '0092_fcm_game_automoves'),
    ]

    operations = [
        migrations.RunPython(migrate_fcm_games, reverse_migration),
    ]
