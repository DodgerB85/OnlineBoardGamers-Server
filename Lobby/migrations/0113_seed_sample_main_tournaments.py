"""Seed a couple of sample Main tournaments so the /nd/AllTournaments/ page
has something to render during design iteration. Idempotent: only adds entries
when no Main tournament of the given name already exists."""

from django.db import migrations


SAMPLE_TOURNAMENTS = [
    {
        "tournamentCategory": "Main",
        "gameCode": "FCM",
        "tournamentName": "May 2026 FCM Tournament",
        "tournamentDescription": "8-player Swiss / knockout FCM tournament with all expansions enabled.",
        "tournamentStatus": "OP",
        "tournamentType": "RR",
        "creator_username": "FCMtourneyAdmin",
        "startingOptions": '["5ap", "ketchup", "gourmet", "garden"]',
        "maxTournamentPlayers": 8,
        "maxGamePlayers": 4,
        "roundsBeforeKnockout": 4,
    },
    {
        "tournamentCategory": "Main",
        "gameCode": "TGZ",
        "tournamentName": "Summer 2026 TGZ Tournament",
        "tournamentDescription": "6-player Rounds + knockout TGZ tournament.",
        "tournamentStatus": "OP",
        "tournamentType": "RR",
        "creator_username": "TGZtourneyAdmin",
        "startingOptions": "[]",
        "maxTournamentPlayers": 6,
        "maxGamePlayers": 3,
        "roundsBeforeKnockout": 4,
    },
]


def seed_sample_main_tournaments(apps, schema_editor):
    from django.conf import settings

    Tournament = apps.get_model("Lobby", "Tournament")
    auth_app, auth_model = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(auth_app, auth_model)

    for spec in SAMPLE_TOURNAMENTS:
        if Tournament.objects.filter(
            tournamentCategory=spec["tournamentCategory"],
            tournamentName=spec["tournamentName"],
        ).exists():
            continue

        creator_username = spec.pop("creator_username", None)
        creator = User.objects.filter(username=creator_username).first() if creator_username else None

        tournament = Tournament.objects.create(
            tournamentCategory=spec["tournamentCategory"],
            gameCode=spec["gameCode"],
            tournamentName=spec["tournamentName"],
            tournamentDescription=spec["tournamentDescription"],
            tournamentStatus=spec["tournamentStatus"],
            tournamentType=spec["tournamentType"],
            creator=creator,
            startingOptions=spec["startingOptions"],
            maxTournamentPlayers=spec["maxTournamentPlayers"],
            maxGamePlayers=spec["maxGamePlayers"],
            roundsBeforeKnockout=spec["roundsBeforeKnockout"],
        )
        if creator is not None:
            tournament.startingPlayers.add(creator)


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0112_normalize_legacy_tournament_statuses"),
    ]

    operations = [
        migrations.RunPython(seed_sample_main_tournaments, migrations.RunPython.noop),
    ]
