from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, User

# The games shown on the "Start a new game" page (Lobby/newGames.html).
# ``extra`` holds POST fields that game's create function indexes directly.
GAMES = [
    {"code": "FCM", "url": "FCM:createFCMgame", "page": "createFCMpage", "extra": {"mapData": ""}},
    {"code": "RNB", "url": "RNB:createRNBgame", "page": "createRNBpage", "extra": {}},
    {"code": "HLC", "url": "HLC:createHLCgame", "page": "createHLCpage", "extra": {}},
    {"code": "TGZ", "url": "TGZ:createTGZgame", "page": "createTGZpage", "extra": {}},
    {"code": "IND", "url": "IND:createINDgame", "page": "createINDpage", "extra": {}},
    {"code": "AQY", "url": "AQY:createAQYgame", "page": "createAQYpage", "extra": {}},
    {"code": "BUS", "url": "BUS:createBUSgame", "page": "createBUSpage", "extra": {}},
    {"code": "CNS", "url": "CNS:createCNSgame", "page": "createCNSpage", "extra": {}},
    {"code": "WEB", "url": "WEB:createWEBgame", "page": "createWEBpage", "extra": {}},
    {"code": "KFW", "url": "KFW:createKFWgame", "page": "createKFWpage", "extra": {"hiddenInfoLevel": "1"}},
    {"code": "LBR", "url": "LBR:createLBRgame", "page": "createLBRpage", "extra": {}},
]


def base_post(game, **overrides):
    data = {
        "playerNumber": "2",
        "gameName": "Test Game",
        "gameDescription": "A test game",
        "pace": "40",
        "kickoutDuration": "100",
    }
    data.update(game["extra"])
    data.update(overrides)
    return data


def messages(response):
    return [str(m) for m in get_messages(response.wsgi_request)]


# Per create page: the form fields it must render. These guard the shared Lobby
# pieces (the kickout options partial, the common options card) from silently
# dropping a seat or a game-type checkbox for one game.
CREATE_PAGE_FIELDS = {
    "createFCMpage": {"seats": [2, 3, 4, 5, 6], "seat_rows": [3, 4, 5, 6], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"], "extras": ['id="fcmAI"']},
    "createRNBpage": {"seats": [2, 3, 4, 5, 6], "seat_rows": [2, 3, 4, 5, 6], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"], "extras": ['<option value="1">', 'id="useSoloMineRules"']},
    "createRNBpage2": {"seats": [2, 3, 4, 5, 6], "seat_rows": [2, 3, 4, 5, 6], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"], "extras": ['<option value="1">', 'id="useSoloMineRules"']},
    "createHLCpage": {"seats": [2, 3, 4, 5], "seat_rows": [3, 4, 5], "game_types": ["trainingGame", "privateGame", "experiencedGame"]},
    "createTGZpage": {"seats": [2, 3, 4, 5], "seat_rows": [3, 4, 5], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"], "submit": "registerbtn"},
    "createINDpage": {"seats": [2, 3, 4, 5], "seat_rows": [3, 4, 5], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createINDpage2": {"seats": [2, 3, 4, 5], "seat_rows": [3, 4, 5], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createAQYpage": {"seats": [2, 3, 4], "seat_rows": [3, 4], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createBUSpage": {"seats": [2, 3, 4, 5], "seat_rows": [3, 4, 5], "game_types": ["trainingGame", "privateGame", "experiencedGame"]},
    "createCNSpage": {"seats": [2, 3, 4], "seat_rows": [3, 4], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createWEBpage": {"seats": [2, 3, 4], "seat_rows": [3, 4], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createKFWpage": {"seats": [2, 3, 4, 5, 6], "seat_rows": [3, 4, 5, 6], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createURRpage": {"seats": [2, 3, 4, 5, 6], "seat_rows": [2, 3, 4, 5, 6], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
    "createNTRpage": {"seats": [2, 3, 4, 5, 6, 7, 8], "seat_rows": [3, 4, 5, 6, 7, 8], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"], "extras": ['id="scenario1"', 'id="scenario2"', 'id="teamPlay"']},
    "createLBRpage": {"seats": [2, 3, 4], "seat_rows": [3, 4], "game_types": ["trainingGame", "privateGame", "learningGame", "experiencedGame"]},
}


class AllGamesCreationTests(TestCase):
    """Cross-game smoke tests for the games on the create-new-game page.

    Each game has its own create function (and some validate invites inline
    while others use SF_validatePlayers), so these assert the behaviours that
    must hold for every game rather than the per-game details. RNB gets deeper
    coverage in test_game_creation.py.
    """

    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")
        self.extra = User.objects.create_user(username="extra", password="pw")
        User.objects.create_user(username="SHADOW", password="pw")
        User.objects.create_user(username="SHADOW_2", password="pw")
        User.objects.create_user(username="SHADOW_3", password="pw")
        self.client.force_login(self.creator)

    def test_can_create_invited_waiting_game(self):
        for game in GAMES:
            with self.subTest(game=game["code"]):
                response = self.client.post(reverse(game["url"]), base_post(game, player2="invited"))

                self.assertEqual(response.status_code, 302, game["code"])
                self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "waiting"}), game["code"])

                created = Game.objects.get(gameCode=game["code"])
                self.assertEqual(created.gameStatus, "WAITING", game["code"])
                self.assertEqual(list(created.invitedPlayers.values_list("username", flat=True)), ["invited"], game["code"])

    def test_cannot_add_yourself_as_another_player(self):
        for game in GAMES:
            with self.subTest(game=game["code"]):
                response = self.client.post(reverse(game["url"]), base_post(game, player2="creator"))

                self.assertEqual(response.status_code, 302, game["code"])
                self.assertEqual(response.url, reverse(game["page"]), game["code"])
                self.assertIn("cannot add yourself", " ".join(messages(response)), game["code"])
                self.assertFalse(Game.objects.filter(gameCode=game["code"]).exists(), game["code"])

    def test_cannot_add_nonexistent_player(self):
        for game in GAMES:
            with self.subTest(game=game["code"]):
                response = self.client.post(reverse(game["url"]), base_post(game, player2="ghost"))

                self.assertEqual(response.status_code, 302, game["code"])
                self.assertEqual(response.url, reverse(game["page"]), game["code"])
                self.assertIn("does not exist", " ".join(messages(response)), game["code"])
                self.assertFalse(Game.objects.filter(gameCode=game["code"]).exists(), game["code"])

    def test_too_many_invited_players_rejected(self):
        # Only the games that route invites through SF_validatePlayers enforce the
        # cap this way; FCM/CNS/KFW/WEB validate inline and simply ignore extra
        # playerN fields beyond the seat count.
        sf_validated = [g for g in GAMES if g["code"] in {"RNB", "HLC", "TGZ", "IND", "AQY", "BUS"}]
        for game in sf_validated:
            with self.subTest(game=game["code"]):
                response = self.client.post(reverse(game["url"]), base_post(game, player2="invited", player3="extra"))

                self.assertEqual(response.status_code, 302, game["code"])
                self.assertEqual(response.url, reverse(game["page"]), game["code"])
                self.assertIn("Too many players", " ".join(messages(response)), game["code"])
                self.assertFalse(Game.objects.filter(gameCode=game["code"]).exists(), game["code"])

    def test_practice_game_starts_automatically_with_shadows(self):
        for game in GAMES:
            with self.subTest(game=game["code"]):
                response = self.client.post(reverse(game["url"]), base_post(game, trainingGame="1"))

                self.assertEqual(response.status_code, 302, game["code"])
                self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}), game["code"])

                created = Game.objects.get(gameCode=game["code"])
                self.assertEqual(created.gameStatus, "ACTIVE", game["code"])
                self.assertTrue(created.statsExcludedGame, game["code"])
                self.assertEqual(created.maxPlayers, 2, game["code"])

                usernames = set(created.players.values_list("player__username", flat=True))
                self.assertEqual(usernames, {"creator", "SHADOW"}, game["code"])

    def test_get_request_rejected(self):
        for game in GAMES:
            with self.subTest(game=game["code"]):
                response = self.client.get(reverse(game["url"]))

                self.assertEqual(response.status_code, 400, game["code"])
                self.assertFalse(Game.objects.filter(gameCode=game["code"]).exists(), game["code"])

    def test_create_pages_render_their_expected_fields(self):
        for page, fields in CREATE_PAGE_FIELDS.items():
            with self.subTest(page=page):
                response = self.client.get(reverse(page))

                self.assertEqual(response.status_code, 200, page)
                body = response.content.decode()
                self.assertIn("global.kickoutOptions = {", body, page)
                self.assertIn("createGamePage", body, page)
                self.assertIn('id="kickoutDuration"', body, page)
                self.assertIn('id="playerNumber"', body, page)
                self.assertIn('id="player2help"', body, page)
                self.assertIn('id="blitzWarningSpan"', body, page)
                self.assertIn(fields.get("submit", "createNewGameButton"), body, page)
                for extra in fields.get("extras", []):
                    self.assertIn(extra, body, f"{page} {extra}")
                for seat in fields["seats"]:
                    self.assertIn(f'id="player{seat}"', body, f"{page} player{seat}")
                for row in fields["seat_rows"]:
                    self.assertIn(f'id="selPlayer{row}"', body, f"{page} selPlayer{row}")
                for game_type in fields["game_types"]:
                    self.assertIn(f'id="{game_type}"', body, f"{page} {game_type}")

    def test_fcm_missing_kickout_falls_back_to_one_day(self):
        # A create page whose kickout select lost its value must still create
        # the game instead of raising MultiValueDictKeyError.
        data = base_post(GAMES[0])
        del data["kickoutDuration"]

        response = self.client.post(reverse("FCM:createFCMgame"), data)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(Game.objects.get(gameCode="FCM").kickoutDuration, rf.KICKOUT_1_DAY)
