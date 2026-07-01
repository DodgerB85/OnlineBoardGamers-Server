import json
from random import randint
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.translation import gettext

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import SF_getGameCreationJsonReturn
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from . import FCMconstants as rfFCM

if TYPE_CHECKING:
    from Lobby.presenters import FCMpresenter


def buildFCMstartingOptions(post_data):
    """Builds the starting options string for FCM games from POST data.

    Args:
        post_data (dict): Dictionary containing form data (e.g., request.POST).

    Returns:
        str: Comma-separated string of game options.
    """
    optionsArr = []
    if "trainingGame" in post_data:
        optionsArr.extend(
            [rfFCM.SO_STRICT_PAYDAY_FRIDGE, int(post_data["trainingGame"])]
        )
    if "fcmAI" in post_data:
        optionsArr.extend([rfFCM.SO_STRICT_PAYDAY_FRIDGE, rf.SO_TRAINING_GAME])

    if "enableAdvancedOptions" in post_data:
        if "randomModules" in post_data:
            if post_data["random_MS"] == "202":
                optionsArr.append(rfFCM.SO_NEW_MS)
            optionsArr.append(rfFCM.SO_RANDOM_MODULES)
            min_modules = post_data["minModules"].zfill(2)  # Pad to two digits
            max_modules = post_data["maxModules"].zfill(2)
            minStr = f"{rfFCM.SO_MIN_RANDOM_MODULES}{min_modules}"
            maxStr = f"{rfFCM.SO_MAX_RANDOM_MODULES}{max_modules}"
            optionsArr.extend([int(minStr), int(maxStr)])
        if "draftModules" in post_data:
            if post_data["draft_MS"] == "302":
                optionsArr.append(rfFCM.SO_NEW_MS)
            if "newDistrictsDraft" in post_data:
                optionsArr.append(rfFCM.SO_NEW_DISTRICTS)
            if "newDistrictsAppDraft" in post_data:
                optionsArr.append(rfFCM.SO_NEW_DISTRICTS_APP)
            if "newDistrictsParkDraft" in post_data:
                optionsArr.append(rfFCM.SO_NEW_DISTRICTS_PARK)
            optionsArr.append(rfFCM.SO_DRAFT_MODULE_BREAKER)

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
        "allowRewind",
    ]
    optionsArr.extend(int(post_data[opt]) for opt in option_names if opt in post_data)
    # return ",".join(options) if options else ""
    return optionsArr


@login_required()
def create_fcm_game(
    request,
    tournamentObj=None,
    round_number_string=None,
    current_players_usernames=None,
):
    is_tournament = tournamentObj is not None
    is_main_tournament = tournamentObj and tournamentObj.tournamentCategory == "Main"
    is_mini_tournament = tournamentObj and tournamentObj.tournamentCategory == "Mini"
    """
    Creates a new FCM game for normal play or tournaments.

    Args:
        request: The HTTP request object.
        tournamentObj: Tournament object (required if is_tournament=True).
        round_number_string (str): Round identifier for tournament games.
        current_players_usernames (list): List of usernames for tournament players.

    Returns:
        HttpResponseRedirect for normal games, or game ID for tournament games.
    """
    if (
        not is_tournament
        and request.method != "POST"
    ):
        return JsonResponse({"error": "POST request required."}, status=400)

    # Initialize game parameters
    game_name = ""
    game_description = ""
    creator = None
    host = None
    game_pace = rf.PACE_STANDARD
    created = SR_getTimeNow()
    player_Order_Seed = 0
    starting_options = []
    max_players = 2
    game_status = "AVAILABLE"
    kickout_duration = rf.KICKOUT_1_DAY
    starting_map = ""
    stats_excluded_game = False
    shadowNameNotes = ""
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
        game_pace = rf.PACE_STANDARD
        kickout_duration = rf.KICKOUT_12_HOURS
        player_Order_Seed = randint(1000, 32767)
        # TODO
        starting_options = (
            json.loads(tournamentObj.startingOptions)
            if tournamentObj.startingOptions
            else []
        )
        notificationSuppression = "0" * max_players
        # If it's a mini tournemnt, check for auto enable rewinds
        # MiniT games could also have max_players LESS than tournamentObj.maxGamePlayers
        if is_mini_tournament:
            max_players = (
                len(current_players_usernames)
                if current_players_usernames
                else tournamentObj.maxGamePlayers
            )
            notificationSuppression = "0" * max_players

        game_status = "ACTIVE"

        # Now exclude stats if any china expansion is in starting options
        # Split the string into a list
        if any(
            x in starting_options
            for x in [
                rfFCM.SO_JAZZ_MUSICIANS,
                rfFCM.SO_DUMPLINGS,
                rfFCM.SO_DELIVERY_DRIVERS,
                rfFCM.SO_HAWKERS,
            ]
        ):
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
        if any(
            x in starting_options
            for x in [
                rfFCM.SO_JAZZ_MUSICIANS,
                rfFCM.SO_DUMPLINGS,
                rfFCM.SO_DELIVERY_DRIVERS,
                rfFCM.SO_HAWKERS,
            ]
        ):
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
        all_players.append(request.user)

        if "fcmAI" in request.POST:
            game_status = "ACTIVE"
            all_players.append(User.objects.get(username="FcmAI"))
            stats_excluded_game = True
        elif "trainingGame" in request.POST:
            game_status = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
            shadow_display = []
            for i in range(1, max_players):
                all_players.append(User.objects.get(username=shadow_names[i - 1]))
                display_name = request.POST.get(f"player{i + 1}", shadow_names[i - 1])
                shadow_display.append(display_name)
            shadowNameNotes = json.dumps(shadow_display, separators=(",", ":"))
            stats_excluded_game = True
        elif "learningGame" in request.POST:
            stats_excluded_game = True
        else:
            invited_players = [
                get_object_or_404(User, username=username) for username in usernames
            ]
            if invited_players:
                usernames_to_notify = usernames
                if "privateGame" not in request.POST:
                    game_status = "WAITING"

    # Database operations
    with transaction.atomic():
        new_game = Game(
            gameCode="FCM",
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
            startingOptions=json.dumps(starting_options, separators=(",", ":")),
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels="200" * max_players,
            startingMap=starting_map,
            statsExcludedGame=stats_excluded_game,
            FCMnotificationSuppression=notificationSuppression,
        )
        new_game.save()

        if is_main_tournament:
            new_game.relatedMainTournament = tournamentObj
        elif is_mini_tournament:
            new_game.relatedMiniTournament = tournamentObj

        # Add players as GamePlayer instances
        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                notes=shadowNameNotes if player == request.user else "",
            )

        for player in invited_players:
            new_game.invitedPlayers.add(player)

        if (
            "trainingGame" in request.POST
            or "fcmAI" in request.POST
            or is_main_tournament
            or is_mini_tournament
            or is_tournament
        ):
            new_game.save()
            presenter = cast("FCMpresenter", new_game.presenter())
            presenter.startGame(request)

        new_game.save()

            # Notifications and redirects
    if is_tournament or is_main_tournament or is_mini_tournament:
        #presenter = cast("FCMpresenter", new_game.presenter())
        #for username in usernames_to_notify:
        #    tournamentType = "normalTournament"
        #    if is_mini_tournament:
        #        tournamentType = "MiniTournament"
        #    SN_M_T_sendTournamentGameStartNotification(
        #        request,
        #        "FCM",
        #        username,
        #        new_game.maxPlayers,
        #        new_game.gameName,
        #        presenter.currentTurnString(),
        #        getattr(new_game, "id"),
        #        False,
        #        tournamentType,
        #    )
        return new_game.id

    # Now handle normal games
    if usernames_to_notify:
        presenter = cast("FCMpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "FCM",
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
            request, SF_getGameCreationJsonReturn("FCM", new_game.id)
        )
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )
