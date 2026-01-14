import json
from random import randint

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext
from django.urls import reverse
from django.contrib import messages
from django.db import transaction
from django.contrib.auth.models import User

from Lobby.models import User  # , Profile
from .models import FCM_Game
from Lobby.sharedFunctions.sharedFunctions import SF_getGameCreationJsonReturn
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_M_T_sendTournamentGameStartNotification,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG


def buildFCMstartingOptions(post_data):
    """Builds the starting options string for FCM games from POST data.

    Args:
        post_data (dict): Dictionary containing form data (e.g., request.POST).

    Returns:
        str: Comma-separated string of game options.
    """
    options = []
    if "trainingGame" in post_data:
        options.extend(["101", post_data["trainingGame"]])
    if "fcmAI" in post_data:
        options.extend(["101", "102"])

    if "enableAdvancedOptions" in post_data:
        if "randomModules" in post_data:
            if post_data["random_MS"] == "202":
                options.append("21")
            options.append("200")
            min_modules = post_data["minModules"].zfill(2)  # Pad to two digits
            max_modules = post_data["maxModules"].zfill(2)
            options.extend([f"210{min_modules}", f"211{max_modules}"])
        if "draftModules" in post_data:
            if post_data["draft_MS"] == "302":
                options.append("21")
            if "newDistrictsDraft" in post_data:
                options.append("18")
            if "newDistrictsAppDraft" in post_data:
                options.append("181")
            if "newDistrictsParkDraft" in post_data:
                options.append("183")
            options.append("300")

    option_names = [
        "short",
        "noMilestones",
        "noCeoMilestone",
        "noRadioMilestone",
        "hardChoices",
        "fryChefs",
        "kimchi",
        "sushi",
        "noodles",
        "gourmet",
        "movieStars",
        "massMarketers",
        "nightShift",
        "ruralMarketers",
        "newDistricts",
        "newDistrictsApp",
        "newDistrictsPark",
        "newDistrictsAll",
        "coffee",
        "ketchupMilestone",
        "newMilestones",
        "lobbyists",
        "reservePrice",
        "strictPaydayFridge",
        "sandboxMode",
        "learningGame",
        "experiencedGame",
        "urbanPlanning",
        "urbanPlanningPlus",
        "jazzMusicians",
        "dumplings",
        "deliveryDrivers",
        "hawkers",
    ]
    options.extend(str(post_data[opt]) for opt in option_names if opt in post_data)
    return ",".join(options) if options else ""


@login_required()
def create_fcm_game(
    request,
    mainORmini="",
    tournamentObj=None,
    round_number_string=None,
    current_players_usernames=None,
):
    is_tournament = mainORmini == "normT"
    is_main_tournament = mainORmini == MAIN_T_FLAG
    is_mini_tournament = mainORmini == MINI_T_FLAG
    """
    Creates a new FCM game for normal play or tournaments.

    Args:
        request: The HTTP request object.
        is_tournament (bool): Whether the game is part of a tournament.
        tournament: Tournament object (required if is_tournament=True).
        round_number_string (str): Round identifier for tournament games.
        current_players_usernames (list): List of usernames for tournament players.

    Returns:
        HttpResponseRedirect for normal games, or game ID for tournament games.
    """
    if not is_tournament and not is_main_tournament and not is_mini_tournament and request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Initialize game parameters
    game_name = ""
    game_description = ""
    creator = None
    host = None
    game_pace = 30
    created = SR_getTimeNow()
    player_Order_Seed = 0
    starting_options = []
    max_players = 2
    game_status = "AVAILABLE"
    kickout_duration = 24
    starting_map = ""
    rewind_consent = ""
    stats_exclude_consent = ""
    stats_excluded_game = False
    player0notes = ""
    usernames_to_notify = []
    all_players = []
    invited_players = []
    notificationSuppression = "0"

    if is_tournament or is_main_tournament or is_mini_tournament:
        if not tournamentObj or not round_number_string:
            raise ValueError(
                "Tournament and round_number_string required for tournament games"
            )
        max_players = tournamentObj.maxGamePlayers
        game_name = f"[{tournamentObj.tournamentName}] {round_number_string}"
        game_description = ""
        creator = User.objects.get(username="admin")
        host = creator
        game_pace = 30
        kickout_duration = 100
        player_Order_Seed = randint(1000, 32767)
        starting_options = tournamentObj.startingOptions
        rewind_consent = "0" * max_players
        notificationSuppression = "0" * max_players
        # If it's a mini tournemnt, check for auto enable rewinds
        # MiniT games could also have max_players LESS than tournamentObj.maxGamePlayers
        if is_mini_tournament:
            max_players = (
                len(current_players_usernames)
                if current_players_usernames
                else tournamentObj.maxGamePlayers
            )
            rewind_consent = "0" * max_players
            notificationSuppression = "0" * max_players
            # Split the string into a list
            options = starting_options.split(",") if starting_options != "" else []
            # Check if '99' is present
            if "99" in options:
                rewind_consent = "2" * max_players
            starting_options = ",".join(options)
            # Filter out '99'
            options = [opt for opt in options if opt != "99"]

        game_status = "ACTIVE"

        stats_exclude_consent = "0" * max_players

        # Now exclude stats if any china expansion is in starting options
        # Split the string into a list
        options_for_SE = starting_options.split(",") if starting_options != "" else []
        if any(x in options_for_SE for x in ["42", "43", "44", "45"]):
            stats_exclude_consent = "1" * max_players
            stats_excluded_game = True

        all_players = [
            User.objects.get(username=username)
            for username in (current_players_usernames or [])
            if username
        ]
        usernames_to_notify = [
            username for username in (current_players_usernames or []) if username
        ]
    # Otherwise, create a normal game
    else:
        # Validate advanced options
        if (
            "enableAdvancedOptions" in request.POST
            and "randomModules" not in request.POST
            and "draftModules" not in request.POST
            and "fcmAI" not in request.POST
        ):
            messages.error(request, gettext("Please Select an Expert Option"))
            return HttpResponseRedirect(reverse("createFCMpage"))

        # Validate player usernames
        usernames = [
            request.POST.get(f"player{i}")
            for i in range(2, 7)
            if request.POST.get(f"player{i}")
        ]
        if "trainingGame" not in request.POST:
            existing_users = set(
                User.objects.filter(username__in=usernames).values_list(
                    "username", flat=True
                )
            )
            for username in usernames:
                if username not in existing_users:
                    messages.error(
                        request, gettext(f"Error: {username} does not exist")
                    )
                    return HttpResponseRedirect(reverse("createFCMpage"))
                if username == request.user.username:
                    messages.error(request, gettext("Error: You cannot add yourself"))
                    return HttpResponseRedirect(reverse("createFCMpage"))

        # Set game name and description
        game_name = (
            f"[{request.POST['scenario']}] {request.POST['gameName']}"
            if "scenario" in request.POST
            else request.POST["gameName"]
        )
        game_description = request.POST["gameDescription"]

        # Determine max players
        if "playerNumber" in request.POST:
            max_players = int(request.POST["playerNumber"])
        else:
            tiles = request.POST["mapData"].split(",")
            max_players = {18: 2, 24: 3, 32: 4, 40: 5, 48: 6}.get(len(tiles), 2)

        player_Order_Seed = randint(0, max_players - 1)
        starting_options = buildFCMstartingOptions(
            request.POST
        )  # Use the extracted function
        # Now exclude stats if any china expansion is in starting options
        # Split the string into a list
        options_for_SE = starting_options.split(",") if starting_options != "" else []
        if any(x in options_for_SE for x in ["42", "43", "44", "45"]):
            stats_exclude_consent = "1" * max_players
            stats_excluded_game = True
        game_pace = request.POST["pace"]
        creator = request.user
        host = request.user
        kickout_duration = request.POST["kickoutDuration"]
        notificationSuppression = "0" * max_players

        # Handle map data
        if request.POST["mapData"]:
            try:
                tiles_list = json.loads(request.POST["mapData"])
            except json.JSONDecodeError:
                tiles_list = [int(tile) for tile in request.POST["mapData"].split(",")]
            starting_map = json.dumps(tiles_list, separators=(",", ":"))

        # Set game status and consents
        game_status = "PRIVATE" if "privateGame" in request.POST else "AVAILABLE"
        rewind_consent = (
            "2" * max_players if "allowRewind" in request.POST else ""
        )  # "0" * max_players
        all_players.append(request.user)

        if "fcmAI" in request.POST:
            game_status = "ACTIVE"
            all_players.append(User.objects.get(username="FcmAI"))
            rewind_consent = "22"
            stats_exclude_consent = "1" * max_players
            stats_excluded_game = True
        elif "trainingGame" in request.POST:
            game_status = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
            shadow_display = []
            for i in range(1, max_players):
                all_players.append(User.objects.get(username=shadow_names[i - 1]))
                display_name = request.POST.get(f"player{i + 1}", shadow_names[i - 1])
                shadow_display.append(display_name)
            player0notes = json.dumps(shadow_display, separators=(",", ":"))
            rewind_consent = "2" * max_players
            stats_exclude_consent = "1" * max_players
            stats_excluded_game = True
        elif "learningGame" in request.POST:
            rewind_consent = "2" * max_players
            stats_exclude_consent = "1" * max_players
            stats_excluded_game = True
        else:
            invited_players = [
                get_object_or_404(User, username=username) for username in usernames
            ]
            if invited_players:
                game_status = "WAITING"
                usernames_to_notify = usernames
            stats_exclude_consent = "0" * max_players

    # Database operations
    with transaction.atomic():
        new_game = FCM_Game(
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=0,
            phase=0,
            created=created,
            latestUpdate=created,
            playerOrderSeed=player_Order_Seed,
            startingOptions=starting_options,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels="200" * max_players,
            startingMap=starting_map,
            rewindConsent=rewind_consent,
            statsExcludeConsent=stats_exclude_consent,
            statsExcludedGame=stats_excluded_game,
            player0notes=player0notes,
            notificationSuppression=notificationSuppression,
        )
        new_game.save()

        if is_tournament:
            new_game.relatedTournament = tournamentObj
        elif is_main_tournament:
            new_game.relatedMainTournament = tournamentObj
        elif is_mini_tournament:
            new_game.relatedMiniTournament = tournamentObj

        # Add players
        for player in all_players:
            new_game.allPlayers.add(player)
        for player in invited_players:
            new_game.invitedPlayers.add(player)

        if "trainingGame" in request.POST or is_main_tournament or is_mini_tournament or is_tournament:
            new_game.startGame(request)

        new_game.save()

    # Notifications and redirects
    if is_tournament or is_main_tournament or is_mini_tournament:
        for username in usernames_to_notify:
            tournamentType = "normalTournament"
            if is_mini_tournament:
                tournamentType = "MiniTournament"
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "FCM",
                username,
                new_game.maxPlayers,
                new_game.gameName,
                new_game.currentTurnString(),
                getattr(new_game, "id"),
                False,
                tournamentType,
            )
        return getattr(new_game, "id")

    # Now handle normal games
    if usernames_to_notify:
        SN_sendInviteNotifications(
            request, usernames_to_notify, new_game.getGameName(), max_players, "FCM"
        )
    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has been started"))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "current"})
        )
    elif "fcmAI" in request.POST:
        messages.success(request, gettext("Your AI game has been started"))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "current"})
        )
    else:
        messages.success(
            request, SF_getGameCreationJsonReturn("FCM", getattr(new_game, "id"))
        )
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )
