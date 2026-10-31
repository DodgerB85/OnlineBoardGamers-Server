"""Eclipse keeps only lobby state in OBG; the bot owns the game itself."""
import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib import messages as django_messages
from django.test import Client, TestCase
from django.urls import reverse

from ECL.models import ECLgameLink
from Lobby.models import Game, GamePlayer, User


class ECLRegistryTests(TestCase):
    def test_game_is_registered_everywhere(self):
        from Lobby.models import Game as GameModel
        from Lobby.sharedFunctions.sharedRefs import SR_GAMES_CODES_AND_NAMES_CHOICES
        from Lobby.views import GAME_NAMES_MODELS

        codes = [code for code, _name in SR_GAMES_CODES_AND_NAMES_CHOICES]
        self.assertIn("ECL", codes)
        self.assertIn("ECL", GAME_NAMES_MODELS)
        self.assertEqual(GameModel.PRESENTER_MAP["ECL"].__name__, "ECLpresenter")


class ECLCreationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user("ecl_creator", password="x")
        self.creator.profile.discord_id = "1001"
        self.creator.profile.save()
        self.client.force_login(self.creator)

    def test_creation_page_renders(self):
        response = self.client.get(reverse("createECLpage"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("Create Eclipse Game", response.content.decode())
        help_response = self.client.get(reverse("ECL:ECLhelp"))
        self.assertEqual(help_response.status_code, 200)

    def test_creation_stores_only_the_lobby_game_and_link(self):
        response = self.client.post(reverse("ECL:createECLgame"), {
            "gameName": "Friday Eclipse",
            "gameDescription": "test",
            "pace": "30",
            "playerNumber": "2",
            "rift_cannon": "1",
            "turn_order_variant": "1",
        })
        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="ECL")
        self.assertEqual(game.gameStatus, "AVAILABLE")
        self.assertEqual(game.maxPlayers, 2)
        self.assertEqual(game.gameData, "")
        self.assertTrue(GamePlayer.objects.filter(game=game, player=self.creator, seat_order=0).exists())
        link = ECLgameLink.objects.get(game=game)
        self.assertEqual(link.external_game_id, "")
        self.assertEqual(game.startingOptions, "[1, 2]")

    def test_creation_refuses_a_player_without_discord(self):
        friend = User.objects.create_user("ecl_friend", password="x")
        response = self.client.post(reverse("ECL:createECLgame"), {
            "gameName": "No Discord",
            "playerNumber": "2",
            "player2": friend.username,
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Game.objects.filter(gameCode="ECL").exists())
        messages = [str(message) for message in django_messages.get_messages(response.wsgi_request)]
        self.assertTrue(any("has not linked Discord" in message for message in messages))


class ECLStartTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user("ecl_start_a", password="x")
        self.creator.profile.discord_id = "2001"
        self.creator.profile.save()
        self.friend = User.objects.create_user("ecl_start_b", password="x")
        self.friend.profile.discord_id = "2002"
        self.friend.profile.save()
        self.game = Game.objects.create(
            gameCode="ECL", gameName="Start me", creator=self.creator, host=self.creator,
            maxPlayers=2, gameStatus="AVAILABLE", latestUpdate="1",
            startingOptions="[1, 2]", zoomLevels="[0, 0]",
        )
        ECLgameLink.objects.create(game=self.game)
        GamePlayer.objects.create(game=self.game, player=self.creator, seat_order=0)
        GamePlayer.objects.create(game=self.game, player=self.friend, seat_order=1)

    def test_start_creates_the_bot_game_once(self):
        request = SimpleNamespace(user=self.creator)
        with patch("ECL.bot.create_remote_game", return_value={
            "id": "aeb7", "tabletalk_url": "https://discord/table", "actions_url": "https://discord/actions",
        }) as create, patch.object(type(self.game.presenter()), "_sendStartGameNotification"):
            self.game.presenter().startGame(request)
            self.game.presenter().startGame(request)

        create.assert_called_once()
        seats, max_players, options = create.call_args.args[1:]
        self.assertEqual(seats, [{"discord_id": "2001", "name": "ecl_start_a"},
                                 {"discord_id": "2002", "name": "ecl_start_b"}])
        self.assertEqual(max_players, 2)
        self.assertEqual(options, [1, 2])
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "ACTIVE")
        link = ECLgameLink.objects.get(game=self.game)
        self.assertEqual(link.external_game_id, "aeb7")
        self.assertEqual(link.actions_url, "https://discord/actions")


class ECLJoinTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user("ecl_join_a", password="x")
        self.creator.profile.discord_id = "4001"
        self.creator.profile.save()
        self.friend = User.objects.create_user("ecl_join_b", password="x")
        self.friend.profile.discord_id = "4002"
        self.friend.profile.save()
        self.game = Game.objects.create(
            gameCode="ECL", gameName="Join me", creator=self.creator, host=self.creator,
            maxPlayers=2, gameStatus="WAITING", latestUpdate="1", startingOptions="[1, 2]",
        )
        ECLgameLink.objects.create(game=self.game)
        GamePlayer.objects.create(game=self.game, player=self.creator, seat_order=0)
        self.game.invitedPlayers.add(self.friend)

    def _join(self):
        return self.client.post(
            reverse("joinGame", kwargs={"gameType": "ECL"}),
            data=json.dumps({"gameID": self.game.id, "action": "join", "source": "ajax"}),
            content_type="application/json",
        )

    def test_final_join_starts_the_bot_game(self):
        self.client.force_login(self.friend)
        with patch("ECL.bot.create_remote_game", return_value={
            "id": "aeb12", "tabletalk_url": "https://discord/table", "actions_url": "https://discord/actions",
        }) as create, patch.object(type(self.game.presenter()), "_sendStartGameNotification"):
            response = self._join()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["listToShow"], "ACTIVE")
        create.assert_called_once()
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "ACTIVE")
        self.assertEqual(ECLgameLink.objects.get(game=self.game).external_game_id, "aeb12")

    def test_join_without_discord_is_refused(self):
        friend = User.objects.create_user("ecl_join_c", password="x")
        self.game.invitedPlayers.add(friend)
        self.client.force_login(friend)
        with patch("ECL.bot.create_remote_game") as create:
            response = self._join()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["listToShow"], "AVAILABLE")
        create.assert_not_called()
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "WAITING")
        self.assertFalse(GamePlayer.objects.filter(game=self.game, player=friend).exists())


class ECLPageTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("ecl_page", password="x")
        self.player.profile.discord_id = "5001"
        self.player.profile.save()
        self.game = Game.objects.create(
            gameCode="ECL", gameName="Table page", creator=self.player, host=self.player,
            maxPlayers=2, gameStatus="ACTIVE", latestUpdate="1",
        )
        ECLgameLink.objects.create(game=self.game, external_game_id="aeb20",
                                   tabletalk_url="https://discord/table",
                                   actions_url="https://discord/actions")
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def test_table_page_renders_with_the_proxy_base(self):
        response = self.client.get(reverse("ECL:showECLgame", args=[self.game.id]))
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn('window.ECL_BASE = "/ECL/%s/proxy";' % self.game.id, body)
        self.assertIn("/ECL/%s/proxy/static/app.js" % self.game.id, body)
        self.assertIn("https://discord/table", body)


@patch.dict("os.environ", {"ECL_BOT_URL": "http://bot.test"})
class ECLProxyTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("ecl_proxy", password="x")
        self.player.profile.discord_id = "3001"
        self.player.profile.save()
        self.game = Game.objects.create(
            gameCode="ECL", gameName="Proxy", creator=self.player, host=self.player,
            maxPlayers=2, gameStatus="ACTIVE", latestUpdate="1",
        )
        ECLgameLink.objects.create(game=self.game, external_game_id="aeb9")
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def test_view_forces_the_logged_in_discord_seat_and_syncs_status(self):
        payload = {
            "game": {"id": "aeb9", "ended": False, "round": 3, "active": ["blue"],
                     "players": [{"id": "3001", "color": "blue"}]},
            "seat": "someone-else",
        }
        response_mock = SimpleNamespace(
            status_code=200, headers={"Content-Type": "application/json"}, content=b"{}",
            json=lambda: payload,
        )
        with patch("ECL.views.requests.request", return_value=response_mock) as request:
            response = self.client.get(
                reverse("ECL:proxy", args=[self.game.id, "api/games/aeb9/view"]),
                {"seat": "9999"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["seat"], "3001")
        self.assertTrue(body["authenticated"])
        self.assertEqual(request.call_args.kwargs["params"], [("seat", "3001")])
        self.game.refresh_from_db()
        self.assertEqual(self.game.turn, 3)
        self.assertTrue(GamePlayer.objects.get(game=self.game, player=self.player).is_current)

    def test_other_bot_game_is_not_proxied(self):
        with patch("ECL.views.requests.request") as request:
            response = self.client.get(
                reverse("ECL:proxy", args=[self.game.id, "api/games/aeb10/view"]))
        self.assertEqual(response.status_code, 404)
        request.assert_not_called()

    def test_post_is_origin_checked_and_seat_bound(self):
        payload = {"game": {"id": "aeb9", "ended": False, "active": [], "players": []}, "seat": "3001"}
        response_mock = SimpleNamespace(
            status_code=200, headers={"Content-Type": "application/json"}, content=b"{}",
            json=lambda: payload,
        )
        url = reverse("ECL:proxy", args=[self.game.id, "api/games/aeb9/press"])
        with patch("ECL.views.requests.request", return_value=response_mock) as request:
            denied = self.client.post(url, data={"seat": "9999"}, content_type="application/json")
            allowed = self.client.post(url, data={"seat": "9999"}, content_type="application/json",
                                       HTTP_ORIGIN="http://testserver")

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(request.call_args.kwargs["json"]["seat"], "3001")

    def test_proxy_posts_are_csrf_exempt(self):
        payload = {"game": {"id": "aeb9", "ended": False, "active": [], "players": []}, "seat": "3001"}
        response_mock = SimpleNamespace(
            status_code=200, headers={"Content-Type": "application/json"}, content=b"{}",
            json=lambda: payload,
        )
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.player)
        with patch("ECL.views.requests.request", return_value=response_mock):
            response = client.post(
                reverse("ECL:proxy", args=[self.game.id, "api/games/aeb9/press"]),
                data={"seat": "9999"}, content_type="application/json",
                HTTP_ORIGIN="http://testserver",
            )
        self.assertEqual(response.status_code, 200)

    def test_spectator_has_no_seat(self):
        spectator = User.objects.create_user("ecl_watch", password="x")
        self.client.force_login(spectator)
        payload = {"game": {"id": "aeb9", "ended": False, "active": [], "players": []}, "seat": "x"}
        response_mock = SimpleNamespace(
            status_code=200, headers={"Content-Type": "application/json"}, content=b"{}",
            json=lambda: payload,
        )
        with patch("ECL.views.requests.request", return_value=response_mock) as request:
            response = self.client.get(
                reverse("ECL:proxy", args=[self.game.id, "api/games/aeb9/view"]),
                {"seat": "3001"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["seat"], "")
        self.assertEqual(request.call_args.kwargs["params"], [])
