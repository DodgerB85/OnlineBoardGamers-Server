from django.db import migrations

KICKOUT_TOPIC = "kickout_player_votes"


def convert_kickout_vote_targets(apps, schema_editor):
    """Rewrite legacy [target_username, timestamp] kickout votes to GamePlayer ids."""
    GamePlayer = apps.get_model("Lobby", "GamePlayer")
    ids_by_game = {}

    for gp in GamePlayer.objects.filter(game__gameStatus="ACTIVE", votesJSON__isnull=False).iterator():
        votes = gp.votesJSON
        if not isinstance(votes, dict):
            continue
        vote = votes.get(KICKOUT_TOPIC)
        if not (isinstance(vote, list) and len(vote) >= 2 and isinstance(vote[0], str)):
            continue

        if gp.game_id not in ids_by_game:
            ids_by_game[gp.game_id] = {
                username: gp_id
                for gp_id, username in GamePlayer.objects.filter(game_id=gp.game_id, player__isnull=False).values_list("pk", "player__username")
            }

        target_id = ids_by_game[gp.game_id].get(vote[0])
        votes = dict(votes)
        if target_id is None:
            # The target is no longer in the game; a stale vote must not block anything.
            votes.pop(KICKOUT_TOPIC, None)
        else:
            votes[KICKOUT_TOPIC] = [target_id, vote[1]]
        gp.votesJSON = votes
        gp.save(update_fields=["votesJSON"])


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0141_gameplayer_flexisecondsused"),
    ]

    operations = [
        migrations.RunPython(convert_kickout_vote_targets, migrations.RunPython.noop),
    ]
