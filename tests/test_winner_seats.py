import json
from unittest.mock import patch

from django.test import TestCase

from Lobby.models import Game, GamePlayer, Tournament, User
from Lobby.presenters import HLCpresenter, INDpresenter, NTRpresenter, WEBpresenter


class WinnerSeatTests(TestCase):
    def _tournament(self, game_code, game_id):
        return Tournament.objects.create(
            tournamentName="Seat winners",
            tournamentCategory="Main",
            gameCode=game_code,
            tournamentType="KO",
            tournamentStatus="IP",
            maxTournamentPlayers=4,
            maxGamePlayers=4,
            tournamentProgressionData=json.dumps(
                [
                    [
                        [["other"], 999999, [], "Round 1"],
                        [["pending"], game_id, [], "Round 1"],
                    ]
                ]
            ),
            tournamentPointsData=json.dumps([]),
            tournamentSideData=json.dumps([]),
        )

    def _game(self, game_code, users, tournament):
        game = Game.objects.create(
            gameCode=game_code,
            creator=users[0],
            host=users[0],
            gameStatus="ACTIVE",
            maxPlayers=len(users),
            startingOptions="[]",
            relatedMainTournament=tournament,
        )
        game_players = [
            GamePlayer.objects.create(game=game, player=user, seat_order=index, is_current=index == 0)
            for index, user in enumerate(users)
        ]
        return game, game_players

    def _progressed_winners(self, tournament, game):
        tournament.refresh_from_db()
        round_rows = json.loads(tournament.tournamentProgressionData)[-1]
        matching = next(row for row in round_rows if row[1] == game.id)
        return matching[2]

    def test_ind_winner_seat_beats_a_stale_username(self):
        users = [User.objects.create_user(f"ind-seat-{index}", password="pw") for index in range(3)]
        game, game_players = self._game("IND", users, None)
        game.relatedMainTournament = self._tournament("IND", game.id)
        game.save(update_fields=["relatedMainTournament"])

        users[1].username = "ind-seat-renamed"
        users[1].save(update_fields=["username"])

        with patch("django_q.tasks.async_task"):
            INDpresenter(game).endGame(
                type("R", (), {"user": users[0]})(),
                "ind-seat-1",
                [1, 0, 2],
                [],
                game.id,
                winnerSeat=1,
            )

        game_players[1].refresh_from_db()
        self.assertTrue(game_players[1].winner)
        self.assertFalse(game_players[0].winner)
        self.assertEqual(self._progressed_winners(game.relatedMainTournament, game), ["ind-seat-renamed"])
        self.assertEqual(
            set(game.relatedMainTournament.nextRoundPlayers.values_list("username", flat=True)),
            {"ind-seat-renamed"},
        )

    def test_ntr_winner_seats_keep_every_team_member(self):
        users = [User.objects.create_user(f"ntr-seat-{index}", password="pw") for index in range(4)]
        game, game_players = self._game("NTR", users, None)
        game.relatedMainTournament = self._tournament("NTR", game.id)
        game.save(update_fields=["relatedMainTournament"])

        with patch("django_q.tasks.async_task"):
            NTRpresenter(game).endGame(
                type("R", (), {"user": users[0]})(),
                ["stale-a", "stale-b"],
                [1, 2, 0, 3],
                game.id,
                winnerSeats=[1, 2],
            )

        for index in (1, 2):
            game_players[index].refresh_from_db()
            self.assertTrue(game_players[index].winner)
        for index in (0, 3):
            game_players[index].refresh_from_db()
            self.assertFalse(game_players[index].winner)
        self.assertEqual(
            self._progressed_winners(game.relatedMainTournament, game),
            ["ntr-seat-1", "ntr-seat-2"],
        )
        self.assertEqual(
            set(game.relatedMainTournament.nextRoundPlayers.values_list("username", flat=True)),
            {"ntr-seat-1", "ntr-seat-2"},
        )

    def test_hlc_final_position_seats_drive_the_notification_and_tournament(self):
        users = [User.objects.create_user(f"hlc-seat-{index}", password="pw") for index in range(3)]
        game, game_players = self._game("HLC", users, None)
        game.relatedMainTournament = self._tournament("HLC", game.id)
        game.save(update_fields=["relatedMainTournament"])

        users[1].username = "hlc-seat-renamed"
        users[1].save(update_fields=["username"])

        with patch("django_q.tasks.async_task") as async_task:
            HLCpresenter(game).endGame(
                type("R", (), {"user": users[0]})(),
                "hlc-seat-1",
                ["stale-first", "stale-second", "stale-third"],
                game.id,
                winnerSeat=1,
                finalPositionsSeats=[1, 0, 2],
            )

        game_players[1].refresh_from_db()
        self.assertTrue(game_players[1].winner)
        final_positions = async_task.call_args.args[2]
        self.assertEqual(
            final_positions,
            [
                ["hlc-seat-renamed", "1st - Congratulations!", 0],
                ["hlc-seat-0", "2nd", 1],
                ["hlc-seat-2", "3rd", 2],
            ],
        )
        self.assertEqual(self._progressed_winners(game.relatedMainTournament, game), ["hlc-seat-renamed"])

    def test_web_winner_seat_index_marks_the_current_player(self):
        users = [User.objects.create_user(f"web-seat-{index}", password="pw") for index in range(3)]
        game, game_players = self._game("WEB", users, None)
        game.relatedMainTournament = self._tournament("WEB", game.id)
        game.save(update_fields=["relatedMainTournament"])

        users[1].username = "web-seat-renamed"
        users[1].save(update_fields=["username"])

        with patch("django_q.tasks.async_task"):
            WEBpresenter(game).endGame(
                type("R", (), {"user": users[0]})(),
                [1],
                [[1], [0], [2]],
                game.id,
            )

        game_players[1].refresh_from_db()
        self.assertTrue(game_players[1].winner)
        self.assertEqual(self._progressed_winners(game.relatedMainTournament, game), ["web-seat-renamed"])
