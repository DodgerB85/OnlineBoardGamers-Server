from django.db import migrations


STATUS_MAP = {
    "PENDING": "PD",
    "PD": "PD",
    "OPEN": "OP",
    "OP": "OP",
    "PRIVATE": "PR",
    "PR": "PR",
    "IN_PROGRESS": "IP",
    "IN PROGRESS": "IP",
    "IP": "IP",
    "FINISHED": "FN",
    "FN": "FN",
}


def normalize_legacy_tournament_statuses(apps, schema_editor):
    Tournament = apps.get_model("Lobby", "Tournament")

    tournaments_to_update = []
    for tournament in Tournament.objects.all().only("id", "tournamentStatus"):
        current_status = (tournament.tournamentStatus or "").strip()
        normalized_status = STATUS_MAP.get(current_status.upper())
        if normalized_status and tournament.tournamentStatus != normalized_status:
            tournament.tournamentStatus = normalized_status
            tournaments_to_update.append(tournament)

    if tournaments_to_update:
        Tournament.objects.bulk_update(tournaments_to_update, ["tournamentStatus"])


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0111_add_transaction_recovery_fields"),
    ]

    operations = [
        migrations.RunPython(normalize_legacy_tournament_statuses, migrations.RunPython.noop),
    ]
