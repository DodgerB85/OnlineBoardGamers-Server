# Generated manually on 2026-02-04

import random
from django.db import migrations


def migrate_ind_games(apps, schema_editor):
    """
    Migrate all IND_Game instances to the new unified Game model with gameCode='IND'
    """
    # Get models - use apps.get_model to get the historical version
    IND_Game = apps.get_model('IND', 'IND_Game')
    Game = apps.get_model('Lobby', 'Game')
    GamePlayer = apps.get_model('Lobby', 'GamePlayer')
    User = apps.get_model('Lobby', 'User')

    # Get all IND games
    ind_games = IND_Game.objects.all().prefetch_related(
        'allPlayers',
        'missingPlayers',
        'kickedPlayers',
        'invitedPlayers',
        'playersWithChatNotification',
        'relatedTournament'
    )

    print(f"\nMigrating {ind_games.count()} IND games to unified Game model...")

    migrated_count = 0

    for ind_game in ind_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode='IND',
            original_id=ind_game.id,

            # Copy BaseGame fields
            gameName=ind_game.gameName,
            gameDescription=ind_game.gameDescription,
            gameStatus=ind_game.gameStatus,
            playerOrderSeed=ind_game.playerOrderSeed,
            maxPlayers=ind_game.maxPlayers,
            turn=ind_game.turn,
            phase=ind_game.phase,
            kickoutDuration=ind_game.kickoutDuration,
            gamePace=ind_game.gamePace,
            chatData=ind_game.chatData,
            gameData=ind_game.gameData,
            rewindData=ind_game.rewindData,
            rewindTempData=ind_game.rewindTempData,
            kickoutFlexiData=ind_game.kickoutFlexiData,
            statsExcludedGame=ind_game.statsExcludedGame,
            zoomLevels=ind_game.zoomLevels,
            latestUpdate=ind_game.latestUpdate,
            created=ind_game.created,
            startingMap=ind_game.startingMap,
            startingOptions=ind_game.startingOptions,
            statsExcludeConsent=ind_game.statsExcludeConsent,
            deleteGameVotes=ind_game.deleteGameVotes if hasattr(ind_game, 'deleteGameVotes') else None,
            activeVotes=ind_game.activeVotes if hasattr(ind_game, 'activeVotes') else None,

            # Copy foreign keys
            creator=ind_game.creator,
            host=ind_game.host,

            # IND-specific fields
            playersPreMoveData=ind_game.playersPreMoveData if hasattr(ind_game, 'playersPreMoveData') else "",
            relatedINDTournament=ind_game.relatedTournament if hasattr(ind_game, 'relatedTournament') else None,
            tournamentGame=ind_game.tournamentGame if hasattr(ind_game, 'tournamentGame') else False,
        )

        # Copy invited players M2M
        new_game.invitedPlayers.set(ind_game.invitedPlayers.all())

        # Get all players and build a mapping for seat order
        all_players = list(ind_game.allPlayers.all())
        missing_players_set = set(ind_game.missingPlayers.all())
        kicked_players_set = set(ind_game.kickedPlayers.all())
        chat_notification_players_set = set(ind_game.playersWithChatNotification.all())

        # Determine seat order using playerOrderSeed (same logic as IND_Game)
        # Shuffle players with the same seed to maintain seat order
        if ind_game.playerOrderSeed > 0:
            player_list = all_players.copy()
            random.Random(ind_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players

        # Determine current player(s)
        # IND supports multiple current players (simultaneous moves), comma-separated
        current_players_str = ind_game.currentPlayers
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            # Also handle special values like SHADOW, SHADOW_2, etc.
            current_players_usernames = {cp.strip() for cp in current_players_str.split(',') if cp.strip()}

        # Determine winner
        winner_user = ind_game.winner if hasattr(ind_game, 'winner') else None

        # Create GamePlayer instances for each player
        game_players = []
        for idx, player in enumerate(player_list):
            is_missing = player in missing_players_set
            is_kicked = player in kicked_players_set
            is_current = player.username in current_players_usernames
            has_chat_notification = player in chat_notification_players_set
            is_winner = (winner_user == player) if winner_user else False

            # Get player notes if they exist
            # IND has player0notes through player4notes
            notes = ""
            player_seat = idx
            if player_seat == 0 and hasattr(ind_game, 'player0notes'):
                notes = ind_game.player0notes
            elif player_seat == 1 and hasattr(ind_game, 'player1notes'):
                notes = ind_game.player1notes
            elif player_seat == 2 and hasattr(ind_game, 'player2notes'):
                notes = ind_game.player2notes
            elif player_seat == 3 and hasattr(ind_game, 'player3notes'):
                notes = ind_game.player3notes
            elif player_seat == 4 and hasattr(ind_game, 'player4notes'):
                notes = ind_game.player4notes

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

    print(f"Successfully migrated {migrated_count} IND games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated IND games from the unified Game model
    """
    Game = apps.get_model('Lobby', 'Game')

    # Delete all IND games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode='IND').count()
    Game.objects.filter(gameCode='IND').delete()

    print(f"Removed {deleted_count} IND games from unified Game model")


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0075_game_playerspremovedata_game_relatedindtournament'),
        ('IND', '0021_indgame'),  # Ensure IND app is available
    ]

    operations = [
        migrations.RunPython(migrate_ind_games, reverse_migration),
    ]
