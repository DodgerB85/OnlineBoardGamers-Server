# Generated manually on 2026-01-28

import random
from django.db import migrations


def migrate_aqy_games(apps, schema_editor):
    """
    Migrate all AQY_Game instances to the new unified Game model with gameCode='AQY'
    """
    # Get models - use apps.get_model to get the historical version
    AQY_Game = apps.get_model('AQY', 'AQY_Game')
    Game = apps.get_model('Lobby', 'Game')
    GamePlayer = apps.get_model('Lobby', 'GamePlayer')
    User = apps.get_model('Lobby', 'User')
    
    # Get all AQY games
    aqy_games = AQY_Game.objects.all().prefetch_related(
        'allPlayers',
        'missingPlayers',
        'kickedPlayers',
        'invitedPlayers',
        'playersWithChatNotification',
        'winner'
    )
    
    print(f"\nMigrating {aqy_games.count()} AQY games to unified Game model...")
    
    migrated_count = 0
    
    for aqy_game in aqy_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode='AQY',
            original_id=aqy_game.id,
            
            # Copy BaseGame fields
            gameName=aqy_game.gameName,
            gameDescription=aqy_game.gameDescription,
            gameStatus=aqy_game.gameStatus,
            playerOrderSeed=aqy_game.playerOrderSeed,
            maxPlayers=aqy_game.maxPlayers,
            turn=aqy_game.turn,
            phase=aqy_game.phase,
            kickoutDuration=aqy_game.kickoutDuration,
            gamePace=aqy_game.gamePace,
            chatData=aqy_game.chatData,
            gameData=aqy_game.gameData,
            rewindData=aqy_game.rewindData,
            rewindTempData=aqy_game.rewindTempData,
            kickoutFlexiData=aqy_game.kickoutFlexiData,
            statsExcludedGame=aqy_game.statsExcludedGame,
            zoomLevels=aqy_game.zoomLevels,
            latestUpdate=aqy_game.latestUpdate,
            created=aqy_game.created,
            startingMap=aqy_game.startingMap,
            startingOptions=aqy_game.startingOptions,
            statsExcludeConsent=aqy_game.statsExcludeConsent,
            deleteGameVotes=aqy_game.deleteGameVotes if hasattr(aqy_game, 'deleteGameVotes') else None,
            activeVotes=aqy_game.activeVotes if hasattr(aqy_game, 'activeVotes') else None,
            
            # Copy AQY-specific fields
            playerTradeData=aqy_game.playerTradeData if hasattr(aqy_game, 'playerTradeData') else '',
            
            # Copy foreign keys
            creator=aqy_game.creator,
            host=aqy_game.host,
            relatedMainTournament=aqy_game.relatedMainTournament if hasattr(aqy_game, 'relatedMainTournament') else None,
            relatedMiniTournament=aqy_game.relatedMiniTournament if hasattr(aqy_game, 'relatedMiniTournament') else None,
        )
        
        # Copy invited players M2M
        new_game.invitedPlayers.set(aqy_game.invitedPlayers.all())
        
        # Get all players and build a mapping for seat order
        all_players = list(aqy_game.allPlayers.all())
        missing_players_set = set(aqy_game.missingPlayers.all())
        kicked_players_set = set(aqy_game.kickedPlayers.all())
        chat_notification_players_set = set(aqy_game.playersWithChatNotification.all())
        winner_players_set = set(aqy_game.winner.all())
        
        # Determine seat order using playerOrderSeed (same logic as AQY_Game)
        # Shuffle players with the same seed to maintain seat order
        if aqy_game.playerOrderSeed > 0:
            player_list = all_players.copy()
            random.Random(aqy_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players
        
        # Determine current player(s)
        current_players_str = aqy_game.currentPlayers
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            current_players_usernames = {cp.strip() for cp in current_players_str.split(',') if cp.strip()}
        
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
            if idx == 0 and hasattr(aqy_game, 'player0notes'):
                notes = aqy_game.player0notes
            elif idx == 1 and hasattr(aqy_game, 'player1notes'):
                notes = aqy_game.player1notes
            elif idx == 2 and hasattr(aqy_game, 'player2notes'):
                notes = aqy_game.player2notes
            elif idx == 3 and hasattr(aqy_game, 'player3notes'):
                notes = aqy_game.player3notes
            
            # Get player move data if they exist
            current_move_time = ""
            current_move_data = ""
            if idx == 0:
                current_move_time = aqy_game.player0currentMoveTime if hasattr(aqy_game, 'player0currentMoveTime') else ""
                current_move_data = aqy_game.player0currentMoveData if hasattr(aqy_game, 'player0currentMoveData') else ""
            elif idx == 1:
                current_move_time = aqy_game.player1currentMoveTime if hasattr(aqy_game, 'player1currentMoveTime') else ""
                current_move_data = aqy_game.player1currentMoveData if hasattr(aqy_game, 'player1currentMoveData') else ""
            elif idx == 2:
                current_move_time = aqy_game.player2currentMoveTime if hasattr(aqy_game, 'player2currentMoveTime') else ""
                current_move_data = aqy_game.player2currentMoveData if hasattr(aqy_game, 'player2currentMoveData') else ""
            elif idx == 3:
                current_move_time = aqy_game.player3currentMoveTime if hasattr(aqy_game, 'player3currentMoveTime') else ""
                current_move_data = aqy_game.player3currentMoveData if hasattr(aqy_game, 'player3currentMoveData') else ""
            
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
                currentMoveTime=current_move_time,
                currentMoveData=current_move_data,
            )
            game_players.append(game_player)
        
        # Bulk create all GamePlayer instances
        GamePlayer.objects.bulk_create(game_players)
        
        migrated_count += 1
        if migrated_count % 100 == 0:
            print(f"  Migrated {migrated_count} games...")
    
    print(f"Successfully migrated {migrated_count} AQY games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated AQY games from the unified Game model
    """
    Game = apps.get_model('Lobby', 'Game')
    
    # Delete all AQY games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode='AQY').count()
    Game.objects.filter(gameCode='AQY').delete()
    
    print(f"Removed {deleted_count} AQY games from unified Game model")


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0065_add_aqy_fields'),
        ('AQY', '0023_aqygame'),
    ]

    operations = [
        migrations.RunPython(migrate_aqy_games, reverse_migration),
    ]
