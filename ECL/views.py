import json
import logging
import re
from urllib.parse import urlparse

import requests
from decouple import config
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext
from django.views.decorators.csrf import csrf_exempt

from Lobby.gameViewHelpers import build_show_game_data
from Lobby.models import Game

from .models import ECLgameLink

LOG = logging.getLogger(__name__)

GAME_RE = re.compile(r"api/games/(?P<bot>[A-Za-z0-9]+)/(?P<endpoint>view|history|press|mirror|"
                     r"board\.webp|tile\.webp|market-layout)")
PANEL_RE = re.compile(r"api/games/(?P<bot>[A-Za-z0-9]+)/(?P<panel>market|player|turn-order|"
                      r"ai|species|parts|blueprint-(?:interceptor|cruiser|dreadnought|starbase|orbital))\.webp")
MEDIA_RE = re.compile(r"api/media/(?P<message_id>\d+)/(?P<name>[A-Za-z0-9_.-]+)")
ASSET_RE = re.compile(r"(?:art|static)/[A-Za-z0-9_./-]+")


def index(request):
    return HttpResponse("Hello, world. You're at Eclipse")


def ECLhelp(request):
    return render(request, "ECL/ECLhelp.html")


@login_required
def createECLgame(request):
    from .common import create_ecl_game

    return create_ecl_game(request)


@login_required
def showECLgame(request, game_id):
    result = build_show_game_data(request, game_id, "ECL", default_zoom=0)
    if isinstance(result, HttpResponseRedirect):
        return result

    current_game = result["game"]
    link = ECLgameLink.objects.filter(game=current_game).first()
    if link is None or not link.external_game_id:
        messages.error(request, gettext("This Eclipse game has not started yet"))
        return redirect("index")

    profile = result["user_profile"]
    seat = str(profile.discord_id or "") if result["user_gp"] else ""
    return render(request, "ECL/showECLgame.html", {
        "gameID": current_game.id,
        "gameName": result["base_data"]["gameName"],
        "seat": seat,
        "tabletalk_url": link.tabletalk_url,
        "actions_url": link.actions_url,
    })


def _bot_base():
    url = config("ECL_BOT_URL", default="").rstrip("/")
    if not url:
        raise RuntimeError("ECL_BOT_URL is not configured")
    return url


def _resolve(path, link):
    """Return (bot path, bot game id) for an allowed proxied path, or None."""
    if path in ("api/games", "api/catalog"):
        return path, None
    match = GAME_RE.fullmatch(path) or PANEL_RE.fullmatch(path)
    if match:
        if match["bot"] != link.external_game_id:
            return None
        return path, match["bot"]
    if MEDIA_RE.fullmatch(path):
        return path, None
    if ASSET_RE.fullmatch(path) and ".." not in path and "//" not in path:
        return path, None
    return None


def _sync_status(game, payload):
    """Keep the lobby's turn/status display honest from the bot's view payload.

    Read-side display sync only: it never writes gameData, latestUpdate or
    accepts a move; the bot remains the only owner of the game.
    """
    bot_game = payload.get("game") or {}
    players = {str(player.get("id")): player for player in bot_game.get("players") or []}
    active = set(bot_game.get("active") or [])
    rows = list(game.players.select_related("player__profile"))
    winners = set()
    if bot_game.get("ended"):
        result = payload.get("result") or []
        points = [row.get("points") for row in result if row.get("points") is not None]
        if points:
            top = max(points)
            winners = {str(row.get("color")) for row in result if row.get("points") == top}

    changed_players = []
    for gp in rows:
        discord_id = getattr(gp.player.profile, "discord_id", "") if gp.player else ""
        player = players.get(str(discord_id), {})
        is_current = player.get("color") in active
        is_winner = player.get("color") in winners
        if gp.is_current != is_current:
            gp.is_current = is_current
            changed_players.append(gp)
        if gp.winner != is_winner:
            gp.winner = is_winner
            changed_players.append(gp)

    round_number = bot_game.get("round")
    status_changed = bool(bot_game.get("ended")) and game.gameStatus != "FINISHED"
    round_changed = round_number is not None and game.turn != round_number
    if status_changed:
        game.presenter().clearGeneralDataOnGameEndWithoutSave()
    if round_changed:
        game.turn = round_number
    if changed_players:
        from Lobby.models import GamePlayer

        GamePlayer.objects.bulk_update(
            {gp.id: gp for gp in changed_players}.values(), ["is_current", "winner"])
    if status_changed:
        game.save()
    elif round_changed:
        game.save(update_fields=["turn"])


@csrf_exempt
@login_required
def proxy(request, game_id, path):
    game = get_object_or_404(Game, id=game_id, gameCode="ECL")
    link = get_object_or_404(ECLgameLink, game=game)
    if not link.external_game_id:
        return JsonResponse({"error": "game has not started"}, status=409)
    resolved = _resolve(path, link)
    if resolved is None:
        return JsonResponse({"error": "path is not proxied"}, status=404)
    bot_path, bot_game_id = resolved
    if request.method not in ("GET", "POST"):
        return HttpResponse(status=405)
    if request.method == "POST":
        origin = request.META.get("HTTP_ORIGIN", "")
        if not origin or urlparse(origin).netloc != request.get_host():
            return JsonResponse({"error": "invalid request origin"}, status=403)

    profile = request.user.profile
    is_player = game.players.exclude(is_kicked=True).filter(player=request.user).exists()
    seat = str(profile.discord_id or "") if is_player else ""
    if request.method == "POST" and not is_player:
        return JsonResponse({"error": "only players can act"}, status=403)

    params = request.GET.copy()
    if bot_game_id is not None and (path.endswith("/view") or path.endswith("/history")):
        if seat:
            params["seat"] = seat
        else:
            params.pop("seat", None)
    if MEDIA_RE.fullmatch(path):
        if not is_player:
            return JsonResponse({"error": "only players can read private media"}, status=403)
        params["game_id"] = link.external_game_id
        params["seat"] = seat

    body = None
    if request.method == "POST":
        try:
            body = json.loads(request.body or b"{}")
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "invalid json"}, status=400)
        if not isinstance(body, dict):
            return JsonResponse({"error": "expected a JSON object"}, status=400)
        body["seat"] = seat
        if bot_path.endswith("/mirror"):
            body["mirror_to_discord"] = True  # an OBG game is always Discord-connected

    try:
        response = requests.request(
            request.method,
            f"{_bot_base()}/{bot_path}",
            params=list(params.items()),
            json=body,
            timeout=120,
            allow_redirects=False,
        )
    except (requests.RequestException, RuntimeError) as exc:
        LOG.warning("Eclipse bot proxy failed for %s: %s", path, exc)
        return HttpResponse("Eclipse bot is unavailable", status=502)

    if 300 <= response.status_code < 400:
        return HttpResponse("Eclipse bot login is enabled; the OBG proxy needs its unauthenticated internal API", status=502)
    if response.status_code >= 500:
        return HttpResponse("Eclipse bot error", status=502)
    if response.headers.get("Content-Type", "").startswith("application/json"):
        try:
            payload = response.json()
        except ValueError:
            return HttpResponse(response.content, status=response.status_code,
                                content_type=response.headers.get("Content-Type"))
        if bot_path == "api/games" and isinstance(payload, dict):
            wanted = [row for row in (payload.get("games") or [])
                      if row.get("id") == link.external_game_id]
            if not wanted:
                turned = requests.get(
                    f"{_bot_base()}/api/games/{link.external_game_id}/view",
                    params={"seat": seat}, timeout=60)
                if turned.ok:
                    state = turned.json().get("game", {})
                    wanted = [{"id": state.get("id"), "name": state.get("name"),
                               "round": state.get("round"), "active": state.get("active", []),
                               "players": [player.get("name") for player in state.get("players", [])]}]
            payload["games"] = wanted
            payload["can_create"] = False
        if (bot_path.endswith("/view") or bot_path.endswith("/press")
                or bot_path.endswith("/mirror")) and isinstance(payload, dict):
            payload["authenticated"] = True
            payload["seat"] = seat
            if bot_path.endswith("/view"):
                try:
                    _sync_status(game, payload)
                except Exception as exc:  # a display sync must not hide the table
                    LOG.warning("Eclipse status sync failed for %s: %s", game.id, exc)
        return JsonResponse(payload, status=response.status_code, safe=False)

    proxied = HttpResponse(response.content, status=response.status_code,
                           content_type=response.headers.get("Content-Type"))
    for header in ("Cache-Control", "X-Board-Key"):
        if header in response.headers:
            proxied[header] = response.headers[header]
    return proxied
