from typing import TYPE_CHECKING, cast

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.contrib import messages
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.translation import gettext
import json
import random
from Lobby.models import User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_TGZadvancedOptions,
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
)  # Replace 'somewhere' with actual module

import Lobby.sharedFunctions.constants as rf

if TYPE_CHECKING:
    from Lobby.presenters import TGZpresenter


@login_required()
def create_tgz_game(
    request,
    mainORmini="",
    tournament=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    is_main_tournament = mainORmini == rf.MAIN_T_FLAG
    is_mini_tournament = mainORmini == rf.MINI_T_FLAG
    """
    Create a TGZ game, either for a tournament or regular play (training/non-training).
    Args:
        request: Django request object.
        is_main_tournament: Boolean indicating if this is a maintournament game.
        is_mini_tournament: Boolean indicating if this is a mini-tournament game.
        tournament: Tournament object (if applicable).
        tournamentGameName: String indicating the round number (if applicable).
        current_players_usernames: List of usernames for pre-assigned players (if applicable).
    Returns:
        JsonResponse or HttpResponseRedirect based on the request type and outcome.
    """
    if not is_main_tournament and not is_mini_tournament and request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    def get_max_players(post_data):
        """Determine max players based on playerNumber or mapData."""
        if "playerNumber" in post_data:
            return int(post_data["playerNumber"])
        tiles_list = post_data.get("mapData", "").split(",")
        tile_counts = {8: 2, 12: 3, 14: 4, 18: 5}
        return tile_counts.get(len(tiles_list), 2)

    def validate_players(usernames, max_players, allow_creator=True):
        """Validate player usernames and return a list of User objects."""
        if not usernames:
            return []
        existing_users = User.objects.filter(username__in=usernames)
        existing_usernames = set(user.username for user in existing_users)
        valid_players = []
        for username in usernames:
            if username not in existing_usernames:
                messages.error(
                    request, gettext(f"Error:Player '{username}' does not exist")
                )
                return None
            if not allow_creator and username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return None
            valid_players.append(get_object_or_404(User, username=username))
        if (
            len(valid_players) > max_players - 1
        ):  # Account for creator in non-tournament games
            messages.error(
                request, gettext(f"Error: Too many players for max {max_players}")
            )
            return None
        return valid_players

    #############################################
    #
    # Regular game creation
    #
    ###############################################
    # Initialize game parameters
    game_name = ""
    game_description = ""
    creator = None
    host = None
    game_pace = 30
    created_time = SR_getTimeNow()
    starting_options = []
    max_players = 2
    game_status = "AVAILABLE"
    kickout_duration = 100
    starting_map = ""
    shadowNameNotes = ""
    usernames_to_notify = []
    #invited_players = []
    stats_exclude = False
    player_order_seed = random.randint(1000, 32767)
    all_players = []
    invited_usernames_objs = []

    max_players = get_max_players(request.POST)

    # Setup Tournament Options
    if is_main_tournament or is_mini_tournament:
        if not tournament or not tournamentGameName:
            raise ValueError(
                "Tournament and tournamentGameName required for tournament games"
            )
        game_name = tournamentGameName
        game_description = ""
        creator = User.objects.get(username="admin")
        host = creator
        game_pace = 30
        kickout_duration = 100
        starting_options = (
            json.loads(tournament.startingOptions)
            if tournament.startingOptions != ""
            else []
        )

        # Set exclude stats if any schism in starting_options
        for option in starting_options:
            if option in [7, 8, 9]:
                stats_exclude = True
                break

        max_players = tournament.maxGamePlayers
        game_status = "ACTIVE"

        all_players = [
            User.objects.get(username=username)
            for username in (current_players_usernames or [])
            if username
        ]
        usernames_to_notify = [
            username for username in (current_players_usernames or []) if username
        ]

    # Else setup normal Options
    else:
        game_name = request.POST.get("gameName", "")
        game_description = request.POST.get("gameDescription", "")
        creator = request.user
        host = request.user
        starting_map = request.POST["mapData"] if "mapData" in request.POST else ""
        game_pace = request.POST.get("pace", 40)
        kickout_duration = request.POST.get("kickoutDuration", 100)
        invited_usernames = [
            request.POST.get(f"player{i}")
            for i in range(2, 6)
            if request.POST.get(f"player{i}")
        ]

        if "trainingGame" not in request.POST:
            invited_usernames_objs = validate_players(
                invited_usernames, max_players, allow_creator=False
            )
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createTGZpage"))

            if len(invited_usernames_objs) > 0:
                game_status = "WAITING"
                usernames_to_notify = [user.username for user in invited_usernames_objs]

        if "trainingGame" in request.POST:
            starting_options.append(int(request.POST["trainingGame"]))
            game_status = "ACTIVE"
            stats_exclude = True
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4"]
            shadow_display = []
            for i in range(1, max_players):
                all_players.append(User.objects.get(username=shadow_names[i - 1]))
                display_name = request.POST.get(f"player{i + 1}", shadow_names[i - 1])
                shadow_display.append(display_name)

            shadowNameNotes = json.dumps(shadow_display, separators=(",", ":"))
        elif "learningGame" in request.POST:
            starting_options.append(int(request.POST.get("learningGame")))
            stats_exclude = True
        elif "experiencedGame" in request.POST:
            starting_options.append(int(request.POST.get("experiencedGame")))

        if "useSchism" in request.POST and "schismRadio" in request.POST:
            starting_options.append(int(request.POST.get("schismRadio")))
            stats_exclude = True

        if "enableAdvancedOptions" in request.POST:
            starting_options.extend(SF_TGZadvancedOptions(request))
            stats_exclude = True
            for entry in starting_options:
                if (
                    isinstance(entry, list)
                    and entry
                    and entry[0] == 90
                    and any(12 <= num <= 23 for num in entry)
                ):
                    starting_options.append(7)
                    break

        all_players.append(request.user)

    from Lobby.models import Game, GamePlayer

    with transaction.atomic():
        new_game = Game(
            gameCode="TGZ",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=0,
            phase=0,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([240] * max_players),
            statsExcludedGame=stats_exclude,
            startingMap=starting_map,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=player_order_seed,
        )

        if is_main_tournament:
            new_game.relatedMainTournament = tournament
        if is_mini_tournament:
            new_game.relatedMiniTournament = tournament

        if "privateGame" in request.POST:
            new_game.gameStatus = "PRIVATE"

        new_game.save()

        # Add players using GamePlayer
        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                is_current=(idx == 0 and game_status == "ACTIVE"),
                notes=shadowNameNotes if player == request.user else "",
            )

        # Add invited players
        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        # Fix zoomLevels array size to match actual number of players
        actual_player_count = len(all_players)
        current_zoom_levels = json.loads(new_game.zoomLevels)
        if len(current_zoom_levels) != actual_player_count:
            # Resize zoomLevels to match actual player count
            new_game.zoomLevels = json.dumps([240] * actual_player_count)
            new_game.save()

        # Start pre-populated games
        if is_main_tournament or is_mini_tournament or "trainingGame" in request.POST:
            presenter = cast("TGZpresenter", new_game.presenter())
            presenter.startGame(request)

        new_game.save()

    # Tournament Notifications and redirects and return
    if is_main_tournament or is_mini_tournament:
        return getattr(new_game, "id")

    # Normal Game Notifications
    if usernames_to_notify:
        presenter = cast("TGZpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "TGZ",
        )

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has been started"))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "current"})
        )

    # Otherwise, return normal game creation with Game model ID
    messages.success(
        request, SF_getGameCreationJsonReturn("TGZ", getattr(new_game, "id"))
    )
    return HttpResponseRedirect(
        reverse("indexListType", kwargs={"listType": "waiting"})
    )
