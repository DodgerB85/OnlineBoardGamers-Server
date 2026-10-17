"""The bug report email must carry the whole Game + GamePlayer records.

The email is meant to be pasted to an AI, so every column of both models has
to survive the round trip - not just the handful of fields the old template
happened to print.
"""
from django.core import mail
from django.test import TestCase

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedNotifications import SN_model_dump, SN_sendBugReportEmail


class BugReportEmailTest(TestCase):
    def setUp(self):
        if not User.objects.filter(username="admin").exists():
            User.objects.create_user("admin", "admin@example.com", "pw")
        self.user = User.objects.create_user("bugreporter", "bug@example.com", "pw")
        self.other = User.objects.create_user("bugreporter2", "bug2@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.user,
            host=self.user,
            gameStatus="ACTIVE",
            gameData="SERVER-GAMEDATA",
            startingMap="SERVER-MAP",
            startingOptions="optA,optB",
        )
        GamePlayer.objects.create(
            game=self.game,
            player=self.user,
            seat_order=0,
            is_current=True,
            notes="my notes",
        )
        GamePlayer.objects.create(game=self.game, player=self.other, seat_order=1)

    def _send(self):
        SN_sendBugReportEmail(
            "bugreporter",
            "bug@example.com",
            "FCM",
            self.game.id,
            "CLIENT-GAMEDATA",
            "the pawns are stuck",
            "RECORDS",
            "MAP/OPTIONS",
        )

    def test_email_contains_every_game_and_gameplayer_field(self):
        self._send()

        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body

        for field in Game._meta.concrete_fields:
            self.assertIn(f"{field.name}:", body, f"missing Game.{field.name}")
        for field in GamePlayer._meta.concrete_fields:
            self.assertIn(f"{field.name}:", body, f"missing GamePlayer.{field.name}")

    def test_email_contains_report_and_both_game_data_copies(self):
        self._send()

        body = mail.outbox[0].body
        self.assertIn("the pawns are stuck", body)
        self.assertIn("CLIENT-GAMEDATA", body)
        self.assertIn("SERVER-GAMEDATA", body)
        self.assertIn("SERVER-MAP", body)
        self.assertIn("optA,optB", body)
        self.assertIn(f"https://www.OnlineBoardGamers.com/FCM/{self.game.id}/show/", body)
        self.assertIn("bugreporter", body)

    def test_player_rows_are_separated_and_named(self):
        self._send()

        body = mail.outbox[0].body
        self.assertEqual(body.count("### Player 1 ###"), 1)
        self.assertEqual(body.count("### Player 2 ###"), 1)
        self.assertIn("player.email: bug@example.com", body)
        self.assertIn("notes: 'my notes'", body)

    def test_missing_game_still_renders(self):
        SN_sendBugReportEmail("bugreporter", "bug@example.com", "FCM", 99999999, "x", "y", "z", "w")

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("(row not found)", mail.outbox[0].body)

    def test_model_dump_marks_relations_with_their_id(self):
        rows = SN_model_dump(self.game)
        creator_row = next(r for r in rows if r.startswith("creator:"))
        self.assertIn(f"(id={self.user.id})", creator_row)
