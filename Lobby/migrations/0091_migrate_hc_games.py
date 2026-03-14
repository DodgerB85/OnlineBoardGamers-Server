from django.db import migrations
import json


def migrate_hc_games(apps, schema_editor):
    HC_Game = apps.get_model("HC", "HC_Game")
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    print(
        f"\nMigrating {HC_Game.objects.all().count()} HC games to unified Game model..."
    )

    migrated_count = 0

    for old_game in HC_Game.objects.all():
        new_game = Game.objects.create(
            gameCode="HC",
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
            startingMap=old_game.startingMap,
            startingOptions=old_game.startingOptions,
            statsExcludeConsent=old_game.statsExcludeConsent,
            deleteGameVotes=old_game.deleteGameVotes,
            creator=old_game.creator,
            host=old_game.host,
            tournamentGame=old_game.tournamentGame,
            relatedHCTournament=old_game.relatedTournament,
        )

        # Copy invited players M2M
        for player in old_game.invitedPlayers.all():
            new_game.invitedPlayers.add(player)

        # Build player list and apply rotation algorithm
        player_list = list(old_game.allPlayers.all())

        if old_game.playerOrderSeed > 0 and len(player_list) > 0:
            offset = old_game.playerOrderSeed % len(player_list)
            player_list = player_list[offset:] + player_list[:offset]

        # Parse currentPlayers string for is_current
        current_players_str = old_game.currentPlayers or ""
        current_player_names = set()
        if current_players_str:
            current_player_names = {
                name.strip() for name in current_players_str.split(",") if name.strip()
            }

        # Get missing, kicked, and chat notification player sets
        missing_player_ids = set(old_game.missingPlayers.values_list("id", flat=True))
        kicked_player_ids = set(old_game.kickedPlayers.values_list("id", flat=True))
        chat_notify_ids = set(
            old_game.playersWithChatNotification.values_list("id", flat=True)
        )

        # Get winner id
        winner_id = old_game.winner_id if old_game.winner_id else None

        # Convery the currentPlayers
        currentPlayersString = old_game.currentPlayers
        current_players_arr = (
            currentPlayersString.split(",") if currentPlayersString else []
        )
        new_game.currentPlayersInTurnOrder = json.dumps(current_players_arr)
        new_game.save()

        for idx, player in enumerate(player_list):
            # Get notes for this seat position
            notes = ""
            if idx == 0:
                notes = old_game.player0notes or ""
            elif idx == 1:
                notes = old_game.player1notes or ""
            elif idx == 2:
                notes = old_game.player2notes or ""
            elif idx == 3:
                notes = old_game.player3notes or ""
            elif idx == 4:
                notes = old_game.player4notes or ""

            # Get move time and data for this seat
            move_time = getattr(old_game, f"player{idx}currentMoveTime", "") or ""
            move_data = getattr(old_game, f"player{idx}currentMoveData", "") or ""

            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                is_current=player.username in current_player_names,
                is_missing=player.id in missing_player_ids,
                is_kicked=player.id in kicked_player_ids,
                has_chat_notification=player.id in chat_notify_ids,
                winner=(player.id == winner_id) if winner_id else False,
                notes=notes,
                currentMoveTime=move_time,
                currentMoveData=move_data,
            )

        # Convert rewindConsent string to activeVotes JSON
        if old_game.rewindConsent and len(player_list) > 0:
            consent_dict = {}
            for seat_idx, player in enumerate(player_list):
                if seat_idx < len(old_game.rewindConsent):
                    consent_dict[player.username] = int(
                        old_game.rewindConsent[seat_idx]
                    )
            new_game.activeVotes = {"rewind_consent": consent_dict}
            new_game.save()

        migrated_count += 1
        if migrated_count % 100 == 0:
            print(f"  Migrated {migrated_count} games...")

    print(f"Successfully migrated {migrated_count} HC games!")


def reverse_migration(apps, schema_editor):
    Game = apps.get_model("Lobby", "Game")
    Game.objects.filter(gameCode="HC").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0090_game_relatedhctournament"),
        ("HC", "0047_hc_game_automoves"),
    ]

    operations = [
        migrations.RunPython(migrate_hc_games, reverse_migration),
    ]
