"""The canonical FCM game URL serves the Vue page; the raw-JS page is gone."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class FcmShowRouteTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player", "p@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)

    def test_show_route_serves_the_vue_page(self):
        self.client.force_login(self.player)
        response = self.client.get(reverse("FCM:showFCMgame", args=[self.game.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "FCM/showFCMgame.html")
        self.assertIn('<div id="app">', response.content.decode())

    def test_preferred_resto_colour_reaches_the_page(self):
        self.player.profile.preferredFCMoptions = json.dumps([3, 0, 0])
        self.player.profile.save(update_fields=["preferredFCMoptions"])
        self.client.force_login(self.player)
        response = self.client.get(reverse("FCM:showFCMgame", args=[self.game.id]))
        self.assertContains(response, "initData.preferedColor = 3;")

    def test_temporary_show2_redirects_to_the_vue_page(self):
        """TEMPORARY: remove with the show2 block in FCM/urls.py."""
        response = self.client.get(f"/FCM/{self.game.id}/show2/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], f"/FCM/{self.game.id}/show/")


class FcmGameAdminTest(TestCase):
    """The admin move-data tool is admin-only and still renders."""

    def test_game_admin_is_gated_and_renders(self):
        player = User.objects.create_user("player", "p@example.com", "pw")
        admin = User.objects.create_user("DodgerB", "d@example.com", "pw")
        admin.profile.is_site_admin = True
        admin.profile.save(update_fields=["is_site_admin"])

        self.client.force_login(player)
        self.assertEqual(self.client.get(reverse("FCM:gameAdmin")).status_code, 400)

        self.client.force_login(admin)
        response = self.client.get(reverse("FCM:gameAdmin"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "FCM/gameAdmin.html")

    def test_username_alone_does_not_grant_admin(self):
        impostor = User.objects.create_user("DodgerB", "x@example.com", "pw")
        self.client.force_login(impostor)
        self.assertEqual(self.client.get(reverse("FCM:gameAdmin")).status_code, 400)

    def test_move_data_endpoint_returns_restructuring_moves(self):
        admin = User.objects.create_user("admin", "a@example.com", "pw")
        admin.profile.is_site_admin = True
        admin.profile.save(update_fields=["is_site_admin"])
        game = Game.objects.create(
            gameCode="FCM",
            creator=admin,
            host=admin,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
            FCMplayersMoveData=json.dumps(
                [
                    ["alice", [3, 4], 12345, [[1], [2], 0]],
                    ["bob", [5], 12345, [[], [], 0]],
                ]
            ),
        )

        self.client.force_login(admin)
        response = self.client.post(
            reverse("FCM:gameAdminGetMoveData"),
            data=json.dumps({"gameID": game.id}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        # Only the restructuring move (type 3) is returned, as [moveData, name]
        self.assertEqual(response.json()["allMoveData"], [[[[1], [2], 0], "alice"]])
