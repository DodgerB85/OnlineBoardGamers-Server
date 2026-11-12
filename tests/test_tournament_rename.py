import json

from django.test import TestCase

from Lobby.models import Tournament, User
from Lobby.sharedFunctions.sharedFunctions import SF_renameTournamentPlayer


class TournamentRenameTests(TestCase):
    def _tournament(self, status="IP"):
        tournament = Tournament.objects.create(
            tournamentName="Test Tournament",
            maxTournamentPlayers=8,
            maxGamePlayers=4,
            tournamentStatus=status,
            tournamentType="MG",
        )
        tournament.startingPlayers.add(User.objects.create_user("oldname", "old@example.com", "pw"))
        tournament.startingPlayers.add(User.objects.create_user("other", "other@example.com", "pw"))
        tournament.tournamentPointsData = json.dumps(
            [
                [
                    ["oldname", 2, 1, [5, 9]],
                    ["oldname2", 1, 0, [3, 4]],
                    ["other", 0, 2, [1, 2]],
                ]
            ]
        )
        tournament.tournamentSideData = json.dumps([["oldname", 2], ["other", 1]])
        tournament.tournamentProgressionData = json.dumps(
            [
                [
                    ["BYEPLAYERS", "oldname"],
                    [["oldname", "other"], 99, ["oldname"], "Round 1"],
                ]
            ]
        )
        tournament.winnersData = json.dumps([["oldname"], ["other"], []])
        tournament.save()
        return tournament

    def test_mg_points_and_bracket_are_updated(self):
        tournament = self._tournament()

        SF_renameTournamentPlayer("oldname", "newname")

        tournament.refresh_from_db()
        points = json.loads(tournament.tournamentPointsData)
        self.assertEqual(points[0][0][0], "newname")
        self.assertEqual(points[0][1][0], "oldname2")
        side = json.loads(tournament.tournamentSideData)
        self.assertEqual(side[0][0], "newname")
        progression = json.loads(tournament.tournamentProgressionData)
        self.assertEqual(progression[0][0][1], "newname")
        self.assertEqual(progression[0][1][0][0], "newname")
        self.assertEqual(progression[0][1][2][0], "newname")
        winners = json.loads(tournament.winnersData)
        self.assertEqual(winners[0][0], "newname")

    def test_finished_tournament_is_not_touched(self):
        tournament = self._tournament(status="FN")

        SF_renameTournamentPlayer("oldname", "newname")

        tournament.refresh_from_db()
        self.assertEqual(json.loads(tournament.tournamentPointsData)[0][0][0], "oldname")
        self.assertEqual(json.loads(tournament.tournamentProgressionData)[0][1][0][0], "oldname")

    def test_exact_name_only(self):
        tournament = self._tournament()

        SF_renameTournamentPlayer("oldname", "newname")

        tournament.refresh_from_db()
        points = json.loads(tournament.tournamentPointsData)
        self.assertEqual(points[0][1][0], "oldname2")
