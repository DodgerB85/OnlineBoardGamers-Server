import json
import random
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_setupTrainingGameShadows,
    SF_validatePlayers,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
)  # Replace 'somewhere' with actual module

if TYPE_CHECKING:
    from Lobby.presenters import BUSpresenter


@login_required()
def create_bus_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    is_main_tournament = tournamentObj and tournamentObj.tournamentCategory == "Main"
    is_mini_tournament = tournamentObj and tournamentObj.tournamentCategory == "Mini"
    """
    Create a Bus game, either for a tournament or regular play (training/non-training).
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
        """Determine max players based on playerNumber or tournament."""
        if "playerNumber" in post_data:
            return int(post_data.get("playerNumber", 3))
        if tournamentObj is not None and (is_main_tournament or is_mini_tournament):
            return tournamentObj.maxGamePlayers
        return 3

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
    invited_usernames = []
    stats_exclude = False
    player_order_seed = random.randint(1000, 32767)
    all_players = []
    invited_usernames_objs = []

    max_players = get_max_players(request.POST)

    # Setup Tournament Options
    if is_main_tournament or is_mini_tournament:
        if not tournamentObj or not tournamentGameName:
            raise ValueError("Tournament and tournamentGameName required for tournament games")
        game_name = tournamentGameName
        game_description = ""
        creator = User.objects.get(username="admin")
        host = creator
        game_pace = 30
        kickout_duration = 50
        starting_options = json.loads(tournamentObj.startingOptions) if tournamentObj.startingOptions != "" else []

        game_status = "ACTIVE"

        all_players = [User.objects.get(username=username) for username in (current_players_usernames or []) if username]
        # NB tournament games return before using this
        usernames_to_notify = [username for username in (current_players_usernames or []) if username]

    # Else setup normal Options
    else:
        game_name = request.POST.get("gameName", "")
        game_description = request.POST.get("gameDescription", "")
        creator = request.user
        host = request.user
        starting_map = request.POST.get("mapData", "")
        game_pace = request.POST.get("pace", 40)
        kickout_duration = request.POST.get("kickoutDuration", 100)
        invited_usernames = [request.POST.get(f"player{i}") for i in range(2, 6) if request.POST.get(f"player{i}")]

        if "trainingGame" not in request.POST:
            invited_usernames_objs = SF_validatePlayers(request, invited_usernames, max_players, allow_creator=False)
            # If no invited playerrs, get []. If error, get None
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createBUSpage"))

            # invited_players = [get_object_or_404(User, username=username) for username in invited_usernames]
            if len(invited_usernames_objs) > 0:
                game_status = "WAITING"
                usernames_to_notify = [user.username for user in invited_usernames_objs]

        if "trainingGame" in request.POST:
            starting_options.append(int(request.POST["trainingGame"]))
            game_status = "ACTIVE"
            stats_exclude = True
            shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
            all_players.extend(shadow_users)
        elif "learningGame" in request.POST:
            starting_options.append(int(request.POST.get("learningGame")))
            stats_exclude = True
        elif "experiencedGame" in request.POST:
            starting_options.append(int(request.POST.get("experiencedGame")))

        if "usePittsburghMap" in request.POST:
            starting_options.append(int(request.POST["usePittsburghMap"]))
            stats_exclude = True

        all_players.append(request.user)

    with transaction.atomic():
        new_game = Game(
            gameCode="BUS",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=1,
            phase=0,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([120] * max_players),
            statsExcludedGame=stats_exclude,
            startingMap=starting_map,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=player_order_seed,
        )
        if "privateGame" in request.POST:
            new_game.gameStatus = "PRIVATE"

        if is_main_tournament:
            new_game.relatedMainTournament = tournamentObj
        if is_mini_tournament:
            new_game.relatedMiniTournament = tournamentObj

        new_game.save()

        # Add invited players M2M
        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        # Create GamePlayer instances for all players
        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                notes=shadowNameNotes if player == request.user else "",
            )

        # Start pre-populated games
        if is_main_tournament or is_mini_tournament or "trainingGame" in request.POST:
            presenter = cast("BUSpresenter", new_game.presenter())
            presenter.startGame(request)

    # Tournament Notifications and redirects and return
    if is_main_tournament or is_mini_tournament:
        # Use the game start notifications rather than a generic tournament one
        return new_game.id

    # THE BELOW IS JUST FOR NORMAL GAMES - TOURNAMENT GAMES RETURN ABOVE
    # Normal Game Notifications
    if usernames_to_notify:
        presenter = cast("BUSpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "BUS",
        )

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    # Otherwise, return normal game creation
    messages.success(request, SF_getGameCreationJsonReturn("BUS", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
