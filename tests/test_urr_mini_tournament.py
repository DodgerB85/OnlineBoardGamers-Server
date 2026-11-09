"""URR mini tournaments can be created and start real URR games."""
import json
from unittest.mock import patch

from django.test import RequestFactory, TestCase
from django.urls import reverse

from Lobby.models import Game, Tournament, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_createNextRoundGamesSetup,
    SF_startAnyTournament,
)


class URRMiniTournamentCreationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.client.force_login(self.creator)

    def test_page_has_mini_tournament_fields(self):
        response = self.client.get(reverse("createURRminiTournament"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse("createURRminiTournament"))
        self.assertContains(response, 'id="tournamentName"')
        self.assertContains(response, 'id="playersPerGameMT"')
        self.assertContains(response, 'id="totalPlayersMT"')
        self.assertContains(response, 'id="invtedPlayersListMT"')
        self.assertNotContains(response, 'id="playerNumber"')

    def test_creation_stores_urr_settings(self):
        with patch("django_q.tasks.async_task"):
            response = self.client.post(
                reverse("createURRminiTournament"),
                {
                    "tournamentName": "Test Cup",
                    "tournamentDescription": "",
                    "tournamentFormat": "RR",
                    "playersPerGameMT": "4",
                    "totalPlayersMT": "8",
                    "invtedPlayersListMT": "[]",
                },
            )

        self.assertEqual(response.status_code, 302)
        tournament = Tournament.objects.get(gameCode="URR")
        self.assertEqual(tournament.tournamentCategory, "Mini")
        self.assertEqual(tournament.maxGamePlayers, 4)
        self.assertEqual(tournament.maxTournamentPlayers, 8)

    def test_two_player_urr_games_are_rejected(self):
        response = self.client.post(
            reverse("createURRminiTournament"),
            {
                "tournamentName": "Too Small",
                "tournamentDescription": "",
                "tournamentFormat": "RR",
                "playersPerGameMT": "2",
                "totalPlayersMT": "8",
                "invtedPlayersListMT": "[]",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createURRminiTournament"))
        self.assertFalse(Tournament.objects.filter(gameCode="URR").exists())


class URRMiniTournamentStartTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = User.objects.create_user(username="admin", password="pw")
        creator = User.objects.create_user(username="creator", password="pw")
        self.players = [User.objects.create_user(username=f"urr-mt-{i}", password="pw") for i in range(4)]
        self.tournament = Tournament.objects.create(
            tournamentCategory="Mini",
            gameCode="URR",
            tournamentName="Test Cup",
            tournamentDescription="",
            tournamentStatus="OP",
            tournamentType="RR",
            startingOptions=json.dumps([]),
            maxTournamentPlayers=4,
            maxGamePlayers=4,
            roundsBeforeKnockout=4,
            creator=creator,
        )
        self.tournament.startingPlayers.add(*self.players)

    def test_starting_creates_active_urr_game(self):
        request = self.factory.get("/")
        request.user = self.admin
        with patch("django_q.tasks.async_task"), patch("django_q.tasks.schedule"):
            SF_startAnyTournament(request, self.tournament)

        created = Game.objects.get(relatedMiniTournament=self.tournament)
        self.assertEqual(created.gameCode, "URR")
        self.assertEqual(created.gameStatus, "ACTIVE")
        self.assertEqual(created.maxPlayers, 4)
        self.assertEqual(created.creator, self.admin)
        self.assertEqual(created.players.count(), 4)

    def test_two_leftover_players_get_byes(self):
        for i in range(2):
            self.tournament.startingPlayers.add(User.objects.create_user(username=f"urr-mt-extra-{i}", password="pw"))
        players = list(self.tournament.startingPlayers.all())
        self.tournament.tournamentProgressionData = json.dumps([])
        self.tournament.tournamentPointsData = json.dumps([[player.username, 0] for player in players])
        self.tournament.save()
        self.tournament.nextRoundPlayers.set(players)

        result = SF_createNextRoundGamesSetup(self.tournament)

        self.assertEqual(len(result["byePlayers"]), 2)
        self.assertEqual(len(result["gamesPlayers"]), 1)
        self.assertEqual(len(result["gamesPlayers"][0]), 4)
