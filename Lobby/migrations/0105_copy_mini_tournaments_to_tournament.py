# Data migration to copy Mini_Tournaments to Tournament with tournamentCategory='Mini'

from django.db import migrations


def copy_mini_tournaments_to_tournament(apps, schema_editor):
    """Copy all Mini_Tournaments to Tournament with tournamentCategory='Mini'"""
    Mini_Tournaments = apps.get_model("Lobby", "Mini_Tournaments")
    Tournament = apps.get_model("Lobby", "Tournament")

    for mini in Mini_Tournaments.objects.all():
        # Create a new Tournament entry from Mini_Tournament
        tournament = Tournament(
            tournamentCategory="Mini",
            gameCode=mini.gameCode,
            tournamentName=mini.tournamentName,
            tournamentDescription=mini.tournamentDescription,
            tournamentStatus=mini.tournamentStatus,
            tournamentType=mini.tournamentType,
            creator=mini.creator,
            startingOptions=mini.startingOptions,
            maxTournamentPlayers=mini.maxTournamentPlayers,
            maxGamePlayers=mini.maxGamePlayers,
            roundsBeforeKnockout=mini.roundsBeforeKnockout,
            winnersData=mini.winnersData,
            created=mini.created,
            tournamentProgressionData=mini.tournamentProgressionData,
            tournamentSideData=mini.tournamentSideData,
            tournamentPointsData=mini.tournamentPointsData,
            chatData=mini.chatData,
        )
        tournament.save()

        # Copy ManyToMany relationships
        tournament.startingPlayers.set(mini.startingPlayers.all())
        tournament.nextRoundPlayers.set(mini.nextRoundPlayers.all())
        tournament.invitedPlayers.set(mini.invitedPlayers.all())


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0104_rename_main_tournament_to_tournament_and_add_category"),
    ]

    operations = [
        migrations.RunPython(
            copy_mini_tournaments_to_tournament,
            migrations.RunPython.noop,
        ),
    ]