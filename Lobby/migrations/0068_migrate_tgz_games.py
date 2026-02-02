# Generated manually on 2026-01-31

import random
from django.db import migrations


def migrate_tgz_games(apps, schema_editor):
    """
    Migrate all TGZ_Game instances to the new unified Game model with gameCode='TGZ'
    """
    # Get models - use apps.get_model to get the historical version
    TGZ_Game = apps.get_model('TGZ', 'TGZ_Game')
    Game = apps.get_model('Lobby', 'Game')
    GamePlayer = apps.get_model('Lobby', 'GamePlayer')
    User = apps.get_model('Lobby', 'User')
    
    # Get all TGZ games
    tgz_games = TGZ_Game.objects.all().prefetch_related(
        'allPlayers',
        'missingPlayers',
        'kickedPlayers',
        'invitedPlayers',
        'playersWithChatNotification'
    )
    
    print(f"\nMigrating {tgz_games.count()} TGZ games to unified Game model...")
    
    migrated_count = 0
    
    for tgz_game in tgz_games:
        # Create the new Game instance
        new_game = Game.objects.create(
            gameCode='TGZ',
            original_id=tgz_game.id,
            
            # Copy BaseGame fields
            gameName=tgz_game.gameName,
            gameDescription=tgz_game.gameDescription,
            gameStatus=tgz_game.gameStatus,
            playerOrderSeed=tgz_game.playerOrderSeed,
            maxPlayers=tgz_game.maxPlayers,
            turn=tgz_game.turn,
            phase=tgz_game.phase,
            kickoutDuration=tgz_game.kickoutDuration,
            gamePace=tgz_game.gamePace,
            chatData=tgz_game.chatData,
            gameData=tgz_game.gameData,
            rewindData=tgz_game.rewindData,
            rewindTempData=tgz_game.rewindTempData,
            kickoutFlexiData=tgz_game.kickoutFlexiData,
            statsExcludedGame=tgz_game.statsExcludedGame,
            zoomLevels=tgz_game.zoomLevels,
            latestUpdate=tgz_game.latestUpdate,
            created=tgz_game.created,
            startingMap=tgz_game.startingMap,
            startingOptions=tgz_game.startingOptions,
            statsExcludeConsent=tgz_game.statsExcludeConsent if hasattr(tgz_game, 'statsExcludeConsent') else None,
            deleteGameVotes=tgz_game.deleteGameVotes if hasattr(tgz_game, 'deleteGameVotes') else None,
            activeVotes=tgz_game.activeVotes if hasattr(tgz_game, 'activeVotes') else None,
            
            # Copy foreign keys
            creator=tgz_game.creator,
            host=tgz_game.host,
            relatedMainTournament=tgz_game.relatedMainTournament if hasattr(tgz_game, 'relatedMainTournament') else None,
            relatedMiniTournament=tgz_game.relatedMiniTournament if hasattr(tgz_game, 'relatedMiniTournament') else None,
        )
        
        # Copy invited players M2M
        new_game.invitedPlayers.set(tgz_game.invitedPlayers.all())
        
        # Get all players and build a mapping for seat order
        all_players = list(tgz_game.allPlayers.all())
        
        # Filter out TGZtourneyAdmin
        all_players = [p for p in all_players if p.username != "TGZtourneyAdmin"]
        
        missing_players_set = set(tgz_game.missingPlayers.all())
        kicked_players_set = set(tgz_game.kickedPlayers.all())
        chat_notification_players_set = set(tgz_game.playersWithChatNotification.all())
        
        # Determine seat order using playerOrderSeed (same logic as TGZ_Game)
        # Shuffle players with the same seed to maintain seat order
        if tgz_game.playerOrderSeed > 0:
            player_list = all_players.copy()
            random.Random(tgz_game.playerOrderSeed).shuffle(player_list)
        else:
            player_list = all_players
        
        # Determine current player(s)
        current_players_str = tgz_game.currentPlayers
        current_players_usernames = set()
        if current_players_str:
            # currentPlayers might be a comma-separated string or single username
            current_players_usernames = {cp.strip() for cp in current_players_str.split(',') if cp.strip()}
        
        # Determine winner
        winner_user = tgz_game.winner if hasattr(tgz_game, 'winner') else None
        
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
            if player_seat == 0 and hasattr(tgz_game, 'player0notes'):
                notes = tgz_game.player0notes
            elif player_seat == 1 and hasattr(tgz_game, 'player1notes'):
                notes = tgz_game.player1notes
            elif player_seat == 2 and hasattr(tgz_game, 'player2notes'):
                notes = tgz_game.player2notes
            elif player_seat == 3 and hasattr(tgz_game, 'player3notes'):
                notes = tgz_game.player3notes
            elif player_seat == 4 and hasattr(tgz_game, 'player4notes'):
                notes = tgz_game.player4notes
            
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
    
    print(f"Successfully migrated {migrated_count} TGZ games!")


def reverse_migration(apps, schema_editor):
    """
    Remove all migrated TGZ games from the unified Game model
    """
    Game = apps.get_model('Lobby', 'Game')
    
    # Delete all TGZ games (cascade will delete GamePlayer instances)
    deleted_count = Game.objects.filter(gameCode='TGZ').count()
    Game.objects.filter(gameCode='TGZ').delete()
    
    print(f"Removed {deleted_count} TGZ games from unified Game model")


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0067_game_relatedtournament'),
        ('TGZ', '0001_initial'),  # Ensure TGZ app is available
    ]

    operations = [
        migrations.RunPython(migrate_tgz_games, reverse_migration),
    ]
