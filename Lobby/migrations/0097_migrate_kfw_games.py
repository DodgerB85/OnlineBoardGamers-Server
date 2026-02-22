import random
import json
from django.db import migrations


def migrate_kfw_games(apps, schema_editor):
    KFW_Game = apps.get_model('KFW', 'KFW_Game')
    Game = apps.get_model('Lobby', 'Game')
    GamePlayer = apps.get_model('Lobby', 'GamePlayer')

    print(f"\nMigrating {KFW_Game.objects.all().count()} KFW games to unified Game model...")
    migrated_count = 0

    for old_game in KFW_Game.objects.all().prefetch_related(
        'allPlayers', 'missingPlayers', 'kickedPlayers',
        'invitedPlayers', 'playersWithChatNotification', 'winner'
    ):
        new_game = Game.objects.create(
            gameCode='KFW',
            original_id=old_game.id,
            gameName=old_game.gameName,
            gameDescription=old_game.gameDescription,
            gameStatus=old_game.gameStatus,
            playerOrderSeed=old_game.playerOrderSeed,
            maxPlayers=old_game.maxPlayers,
            turn=old_game.turn,
            phase=old_game.phase,
            kickoutDuration=old_game.kickoutDuration,
            gamePace=old_game.gamePace,
            chatData=old_game.chatData,
            gameData=old_game.gameData,
            rewindData=old_game.rewindData,
            rewindTempData=old_game.rewindTempData,
            kickoutFlexiData=old_game.kickoutFlexiData,
            statsExcludedGame=old_game.statsExcludedGame,
            zoomLevels=old_game.zoomLevels,
            latestUpdate=old_game.latestUpdate,
            created=old_game.created,
            startingMap=old_game.startingMap if hasattr(old_game, 'startingMap') else "",
            startingOptions=old_game.startingOptions,
            statsExcludeConsent=old_game.statsExcludeConsent,
            deleteGameVotes=old_game.deleteGameVotes if hasattr(old_game, 'deleteGameVotes') else None,
            creator=old_game.creator,
            host=old_game.host,
            tournamentGame=old_game.tournamentGame,
            # KFW-specific fields
            KFWserverData=old_game.serverData,
            KFWplayersHiddenData=old_game.playersHiddenData,
            KFWplayersMoveData=old_game.playersMoveData,
        )

        # Copy invited players M2M
        for player in old_game.invitedPlayers.all():
            new_game.invitedPlayers.add(player)

        # Replicate KFW's getAllPlayersOrderedySeat(True) algorithm:
        # sort alphabetically, then shuffle with playerOrderSeed
        all_players = list(old_game.allPlayers.all())
        sorted_players = sorted(all_players, key=lambda p: p.username)
        random.Random(old_game.playerOrderSeed).shuffle(sorted_players)
        player_list = sorted_players

        # Parse currentPlayers string for is_current
        current_players_str = old_game.currentPlayers or ""
        current_player_names = set()
        if current_players_str:
            current_player_names = {
                name.strip() for name in current_players_str.split(",")
                if name.strip()
            }

        # Get missing, kicked, and chat notification player sets
        missing_player_ids = set(old_game.missingPlayers.values_list('id', flat=True))
        kicked_player_ids = set(old_game.kickedPlayers.values_list('id', flat=True))
        chat_notify_ids = set(old_game.playersWithChatNotification.values_list('id', flat=True))

        # Get winner ids (KFW winner is M2M)
        winner_ids = set(old_game.winner.values_list('id', flat=True))

        # Save currentPlayersInTurnOrder
        current_players_arr = current_players_str.split(',') if current_players_str else []
        new_game.currentPlayersInTurnOrder = json.dumps(current_players_arr)
        new_game.save()

        # Build rewind consent activeVotes if present
        rewind_consent_str = getattr(old_game, 'rewindConsent', '') or ''
        if rewind_consent_str and len(player_list) > 0:
            consent_dict = {}
            for seat_idx, player in enumerate(player_list):
                if seat_idx < len(rewind_consent_str):
                    consent_dict[player.username] = int(rewind_consent_str[seat_idx])
            new_game.activeVotes = {"rewind_consent": consent_dict}
            new_game.save()

        for idx, player in enumerate(player_list):
            notes = ""
            if idx == 0:
                notes = getattr(old_game, 'player0notes', '') or ""
            elif idx == 1:
                notes = getattr(old_game, 'player1notes', '') or ""
            elif idx == 2:
                notes = getattr(old_game, 'player2notes', '') or ""
            elif idx == 3:
                notes = getattr(old_game, 'player3notes', '') or ""
            elif idx == 4:
                notes = getattr(old_game, 'player4notes', '') or ""
            elif idx == 5:
                notes = getattr(old_game, 'player5notes', '') or ""

            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                is_current=player.username in current_player_names,
                is_missing=player.id in missing_player_ids,
                is_kicked=player.id in kicked_player_ids,
                has_chat_notification=player.id in chat_notify_ids,
                winner=player.id in winner_ids,
                notes=notes,
            )

        migrated_count += 1
        if migrated_count % 100 == 0:
            print(f"  Migrated {migrated_count} games...")

    print(f"Successfully migrated {migrated_count} KFW games!")


def reverse_migration(apps, schema_editor):
    Game = apps.get_model('Lobby', 'Game')
    Game.objects.filter(gameCode='KFW').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0096_game_kfw_fields'),
        ('KFW', '0015_kfw_game_gamedatablob'),
    ]

    operations = [
        migrations.RunPython(migrate_kfw_games, reverse_migration),
    ]
