import json
import time
import datetime
import requests
import traceback
import re
import logging
import base64
import gzip
from django.core.cache import cache

# from telegram import Update
# from telegram.ext import Application, CommandHandler, ContextTypes
from decouple import config

# import hashlib
# import urllib

# from random import randint
from itertools import chain  # , islice
from datetime import timedelta
from collections import Counter

from django.db import connection, transaction
from django.db.models import Exists, OuterRef
from django.contrib import messages
from django.contrib.auth import (
    authenticate,
    login,
    logout,
    get_user_model,
    update_session_auth_hash,
    get_user,
)
from django.contrib.auth.decorators import login_required

from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth.tokens import default_token_generator
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.urls import reverse

from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode,
    url_has_allowed_host_and_scheme,
)
from django.utils.safestring import mark_safe
from django.utils.translation import gettext  # , get_language
from django.utils import translation
from django.utils import timezone

from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail, BadHeaderError
from django.views.generic import View
from django.views.i18n import set_language as django_set_language
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from django.http import (
    HttpResponse,
    HttpResponseRedirect,
    JsonResponse,
    Http404,
    HttpResponsePermanentRedirect,
)
from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import (
    Q,
    Count,
    IntegerField,
)
from django.db.models.functions import TruncDate, Cast
from django.db.models.expressions import RawSQL

from contextlib import contextmanager

from django.template.loader import render_to_string

from django.conf import settings

from .tokens import account_activation_token
from .forms import (
    NewUserForm,
    UpdateProfileForm,
    PasswordChangeCustomForm,
    PasswordResetFormCustom,
    changelogForm,
)

from .models import (
    Game,
    GamePlayer,
    Profile,
    changelog,
    Mini_Tournaments,
    Main_Tournament,
    QueryableGameAllPlayers,
)

from FCM.models import FCM_Game, FCM_Tournament
from HC.models import HC_Game, HC_Tournament
from Bus.models import Bus_Game, Bus_Tournament
from TGZ.models import TGZ_Game
from AQY.models import AQY_Game, AQY_Tournament
from IND.models import IND_Game, IND_Tournament
from KFW.models import KFW_Game
from RNB.models import RNB_Game

from user_visit.models import UserVisit

from FCM.common import buildFCMstartingOptions

from Lobby.sharedFunctions.sharedFunctions import (
    SF_hasRequiredExperience,
    SF_startAnyTournament,
    SF_getRequiredExp,
    SF_startAnyTournament,
    SF_getMiniTournamentCreationJsonReturn,
    SF_TGZadvancedOptions,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendDeclineEmail,
    SN_sendAdminErrorMessage,
    SN_sendMiniTournamentInvite,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_WEBHOOK_CHOICES,
    SR_getAnyTournamentPlayersData,
    SR_getAnyTournamentRoundsData,
    SR_getFCMstartingOptionsHTML,
    SR_getTournamentTypeDisplay,
    SR_getTGZstartingOptionsHTML,
    SR_getgodsVRoptionsHTML,
    SR_getPointsForPosition,
)

from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG


User = get_user_model()

logger = logging.getLogger(__name__)


def usesUnifiedGameModel(game_code):
    """
    Returns True if the game uses the unified Game model with GamePlayer relationships.
    Returns False if the game uses the legacy model with M2M relationships.
    
    As games are migrated to the unified model, add their game codes here.
    """
    return game_code in ['CNS', 'WEB']


##########################
#
#   Attempt at Telegram Bot.
#   Currently Disabled; using seperate python server
#
##########################

# Initialize Application
# try:
#    logger.error(f"Not an error - test log")
#    application = Application.builder().token(BOT_TOKEN).build()
# except Exception as e:
#    logger.error(f"Failed to initialize Application: {str(e)}")
#    raise


# /start command handler
# async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
#    logger.debug("Received /start command")
#    if update.message:
#        await update.message.reply_text("Hello! Welcome to OnlineBoardGamers bot. Type /help for more info.")
#    else:
#        logger.warning("No message in /start update")
#
#
## /help command handler
# async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
#    logger.debug("Received /help command")
#    if update.message:
#        await update.message.reply_text(
#            "This is the help message for OnlineBoardGamers! Visit https://OnlineBoardGamers.com for more."
#        )
#    else:
#        logger.warning("No message in /help update")


# Add handlers
# application.add_handler(CommandHandler("start", start))
# application.add_handler(CommandHandler("help", help_command))


# @csrf_exempt
# def TG_webhook(request):
#    """Handle incoming Telegram webhook updates."""
#    logger.debug(f"Received request: method={request.method}, body={request.body}")
#    if request.method == "POST":
#        try:
#            logger.debug("Attempting to parse JSON")
#            update_data = json.loads(request.body.decode("utf-8"))
#            logger.debug(f"Parsed update: {update_data}")
#            update = Update.de_json(update_data, application.bot)
#            if update:
#                logger.debug(f"Processing update: {update.update_id}")
#                application.process_update(update)  # type: ignore[no-untyped-call]  # Suppress Pylance error
#                logger.debug("Update processed successfully")
#                return HttpResponse(status=200)
#            else:
#                logger.error("Failed to parse update: Update object is None")
#                return HttpResponse(
#                    content="Invalid update data: Update object is None", status=400
#                )
#        except json.JSONDecodeError as e:
#            logger.error(f"JSON parsing error: {str(e)}")
#            return HttpResponse(content=f"JSON parsing error: {str(e)}", status=400)
#        except Exception as e:
#            logger.error(f"Webhook error: {str(e)}")
#            return HttpResponse(content=f"Webhook error: {str(e)}", status=400)
#    logger.warning(f"Invalid request method: {request.method}")
#    return HttpResponse(status=405)

#################################
#
#   END Telegram Bot attempt
#
#################################


@csrf_exempt
@login_required
def addTGid(request, TGid):
    try:
        webhookType = "TG"
        webhookURL = ""
        webhookUserID = str(TGid)

        if len(str(webhookUserID)) > 50:
            error_string = gettext("Entry too long")
            messages.error(request, error_string)
            return redirect("profile")

        # If telegram, should be a number
        if webhookType == "TG":
            if len(str(webhookUserID)) == 0:
                error_string = gettext("Please enter a Telegram user ID")
                messages.error(request, error_string)
                return redirect("profile")
            if len(str(webhookUserID)) != 0 and not str(webhookUserID).isdigit():
                error_string = gettext("Telegram user ID is normally a 10 digit number")
                messages.error(request, error_string)
                return redirect("profile")

            # Now it is valid, so add it to the profile
            profile = Profile.objects.get(user=request.user)
            currentWebhooks = (
                json.loads(profile.webhooks)
                if profile.webhooks != "" and profile.webhooks is not None
                else []
            )
            if len(currentWebhooks) >= 6:
                error_string = gettext("Too many webhooks already added")
                messages.error(request, error_string)
                return redirect("profile")

            if any(x[2] == webhookUserID and x[0] == "TG" for x in currentWebhooks):
                error_string = gettext("This Telegram user ID has already been added")
                messages.error(request, error_string)
                return redirect("profile")

            currentWebhooks.append([webhookType, webhookURL, webhookUserID])
            profile.webhooks = json.dumps(currentWebhooks, separators=(",", ":"))
            profile.save()
            messages.success(
                request,
                gettext(
                    "Telegram Notifications added - send a test message (next to your new webhook entry)"
                ),
            )
            return redirect("profile")

    except User.DoesNotExist:
        return HttpResponse(status=500)


GAME_NAMES_MODELS = {
    "FCM": FCM_Game,
    "HC": HC_Game,
    "Bus": Bus_Game,
    "TGZ": TGZ_Game,
    "CNS": "CNS",  # Now using unified Game model
    "AQY": AQY_Game,
    "IND": IND_Game,
    "KFW": KFW_Game,
    "WEB": "WEB",  # Now using unified Game model
}
GAME_MODELS = [
    FCM_Game,
    HC_Game,
    Bus_Game,
    TGZ_Game,
    # CNS and WEB now use unified Game model
    AQY_Game,
    IND_Game,
    KFW_Game,
    # WEB_Game removed - now uses unified Game model
]


def testLobby(request):
    # subject = 'Thank you for registering to our site'
    # message = ' it  means a world to us '
    # email_from = settings.EMAIL_HOST_USER
    # recipient_list = ['rogerball85@hotmail.com', ]

    # send_mail(subject, message, email_from, recipient_list)
    if request.user.username == "admin":
        pass
        # user1 = User.objects.get(username="user1")
        # p2 = User.objects.get(username="33")
    # return redirect('index')
    return HttpResponse(status=204)  # No Content


def lobbyHelp(request):
    return render(request, "Lobby/lobbyHelp.html")


def helpTournaments(request):
    return render(request, "Lobby/tournamentsHelp.html")


def helpTournamentsMini(request):
    return render(request, "Lobby/tournamentsMiniHelp.html")


# ALLOWED_USERS = ["admin", "DodgerB", "joshuastarr", "Lemem", "waymost", "timmymayes", "Ftep", "vraid", "RJ_E", "michazhn", "Dopple", "burmer", "siddhig", "Melk0r", "Steveth", "kbbr", "Brent", "Beezy", "durendal", "Gauss"]


@login_required
def indexSpecialRedirect(request):
    # ALLOWED_USERS = [
    #    "admin",
    #    "user1",
    #    "ha.steven",
    #    "massibull",
    #    "durendal",
    #    "DodgerB",
    #    "BotKickStarter",
    #    "Rastko",
    #    "Benkyo",
    #    "vraid",
    #    "F1087",
    #    "krieg90",
    #    "gdc",
    #    "enavico",
    #    "PhasingPlayer",
    #    "Acacia",
    # ]
    # ALLOWED_USERS += [
    #    "ha.steven",
    #    "Kawlos",
    #    "Jasonbartfast",
    #    "Batch",
    #    "Juni",
    #    "TDUBZ",
    #    "BigBad",
    #    "massibull",
    #    "durendal",
    #    "DodgerB",
    #    "BotKickStarter",
    #    "33",
    #    "Rastko",
    #    "Burmer",
    #    "phil",
    # ]
    # ALLOWED_USERS += ["Benkyo", "Steveth", "F1087", "krieg90", "gdc", "michazhn", "Hohohale"]
    # "Jasonbartfast", "Kawlos", "Batch", "Juni", "TDUBZ", "BigBad",   '33',  'Steveth', ]
    #'looogic',
    #'phil', 'huddyrx', 'user1', 'craggybackhand', 'Strange8ractor', ]
    # print("******************************************************************************************************** TGZ ACCESS: =================================================:  " + request.user.username)
    print(f"Db htis: {len(connection.queries)}")
    #qs = QueryableGameAllPlayers.objects.filter(player_id=1).select_related(
    #    "queryable_game", "player"
    #)
    #results = list(qs)
    #print(results)

    # for game in results:
    #    players = game.allPlayers.all()

    #for item in results:
        # This will hit the DB for each loop unless you used select_related('player')
    #    print(item.player.username)

    #first_game = results[0]
    #print(dir(first_game))

    # Or check the __dict__ to see the data stored
    #print(first_game.__dict__)

    #print(f"Db htis: {len(connection.queries)}")
    print(f"Db htis: {len(connection.queries)}")

    ALLOWED_USERS = [
        "admin",
        "DodgerB",
        "durendal",
        "Benkyo",
        "vraid",
        "JoshuaAcosta",
        "massibull",
        "phil",
        "timmymayes",
    ]
    if request.user.username not in ALLOWED_USERS:
        return redirect("index")

    # return redirect('index')
    return HttpResponseRedirect(reverse("RNB:showRNBgame"))
    # return HttpResponseRedirect(reverse('IND:showINDgame'))


def set_language_custom(request):
    response = django_set_language(request)

    # Check if language was successfully set
    language_code = request.POST.get("language")
    if language_code and response.status_code == 302 and request.user.is_authenticated:
        # Store language choice in database
        profile = Profile.objects.get(user=request.user)
        profile.profileLanguage = language_code
        profile.save()

    return response


@login_required()
def userStats(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        raise Http404()

    user_stats_data = (
        User.objects.annotate(date_joined_date=TruncDate("date_joined"))
        .values("date_joined_date")
        .annotate(total_users=Count("id"))
        .order_by("date_joined_date")
    )

    dates = []
    user_counts = []

    current_date = user_stats_data[0]["date_joined_date"]
    cumulative_user_count = 0

    for data in user_stats_data:
        while data["date_joined_date"] > current_date:
            dates.append(current_date.strftime("%Y-%m-%d"))
            user_counts.append(cumulative_user_count)
            current_date += timedelta(days=1)

        cumulative_user_count += data["total_users"]
        dates.append(data["date_joined_date"].strftime("%Y-%m-%d"))
        user_counts.append(cumulative_user_count)

    users_last_login = (
        User.objects.exclude(last_login__isnull=True)
        .exclude(last_login__exact=None)
        .values_list("last_login", flat=True)
    )

    # Get the current time
    current_time = timezone.now()

    # Initialize the counter
    user_counter = Counter()

    for login_date in users_last_login:
        if login_date <= current_time:
            user_counter[login_date.date()] += 1

    # Generate the accumulated count for each date
    cumulative_count = 0
    last_login_data = []

    for date, count in sorted(user_counter.items()):
        cumulative_count += count
        last_login_data.append(
            {"date": date.strftime("%Y-%m-%d"), "count": cumulative_count}
        )

    ###### LAST LOGIN BAR CHART ########
    # Query the number of users that last logged in on each day
    user_login_counts = (
        User.objects.exclude(last_login__isnull=True)
        .exclude(last_login__exact=None)
        .annotate(login_date=TruncDate("last_login"))
        .values("login_date")
        .annotate(count=Count("id"))
        .order_by("login_date")
    )

    # Prepare the data for the bar chart
    last_login_data_bar = [
        {"date": entry["login_date"].strftime("%Y-%m-%d"), "count": entry["count"]}
        for entry in user_login_counts
    ]

    ###### DIFFERENCE BETWEEN JOIN AND LAST LOGIN ########
    users = User.objects.all()
    durations = []

    for user in users:
        if user.last_login is not None and user.date_joined is not None:
            duration = (user.last_login.date() - user.date_joined.date()).days
            durations.append(duration)

    duration_counts = Counter(durations)

    join_to_last_login_data = [
        {"days_between": duration, "count": count}
        for duration, count in duration_counts.items()
    ]

    return render(
        request,
        "Lobby/admin/userStats.html",
        {
            "dates": dates,
            "user_counts": user_counts,
            "last_login_data": last_login_data,
            "last_login_data_bar": last_login_data_bar,
            "join_to_last_login_data": join_to_last_login_data,
        },
    )


@login_required()
def DBO(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        raise Http404()

    gamesList = []
    remaining_start_time_expired = -60 * 60 * 24 * 365 * 5  # 5 years
    remaining_finish_time_expired = -60 * 60 * 24 * 30  # 30 days
    totalGamesCount = 0
    pracGamesCount = 0
    finishedGamesCount = 0

    # Load all unified model games at once
    query = (
        Q(gameStatus="ACTIVE") | Q(gameStatus="PRIVATE") | Q(gameStatus="WAITING")
    )
    
    unified_games = Game.objects.filter(query).prefetch_related('players__player').select_related('creator')
    
    # Group by gameCode
    from collections import defaultdict
    games_by_code = defaultdict(list)
    for game in unified_games:
        games_by_code[game.gameCode].append(game)
    
    # Count finished games for each unified game code
    for game_code in games_by_code.keys():
        finishedGamesCount += Game.objects.filter(gameCode=game_code, gameStatus="FINISHED").count()
    
    # Process all unified games
    for game_code, games in games_by_code.items():
        for singleGame in games:
            presenter = singleGame.presenter()
            timeRemaining = presenter.getSecondsToNextKickout()

            if (
                timeRemaining >= remaining_start_time_expired
                and timeRemaining <= remaining_finish_time_expired
            ):
                if singleGame.players.filter(player__username="SHADOW").exists():
                    pracGamesCount += 1
                gamesList.append(presenter.serialize(request.user))
                totalGamesCount += 1

    for game_in_use_model in GAME_MODELS:
        # Query the game_in_use_model to get the players who will timeout within the specified time range
        query = (
            Q(gameStatus="ACTIVE") | Q(gameStatus="PRIVATE") | Q(gameStatus="WAITING")
        )
        query_finished = Q(gameStatus="FINISHED")

        allGames = game_in_use_model.objects.filter(query).all()
        finishedGamesCount += (
            game_in_use_model.objects.filter(query_finished).count()
        )

        for singleGame in allGames:
            timeRemaining = singleGame.getSecondsToNextKickout()

            if (
                timeRemaining >= remaining_start_time_expired
                and timeRemaining <= remaining_finish_time_expired
            ):
                if singleGame.allPlayers.filter(username="SHADOW").exists():
                    pracGamesCount += 1
                gamesList.append(singleGame.serialize(request.user))
                totalGamesCount += 1

    # Sort the list by the latestUpdate property
    gamesList = sorted(gamesList, key=lambda obj: int(obj["latestUpdate"]))
    gamesListLen = len(gamesList)
    return render(
        request,
        "Lobby/admin/DBO.html",
        {
            "gamesList": gamesList,
            "gamesListLen": gamesListLen,
            "totalGamesCount": totalGamesCount,
            "pracGamesCount": pracGamesCount,
            "noramlGamesCount": totalGamesCount - pracGamesCount,
            "finishedGamesCount": finishedGamesCount,
        },
    )


@login_required
def DBO_deleteGame(request, game_type):
    # 1. Authorization check
    if request.user.username not in ["admin", "DodgerB"]:
        raise Http404()

    if request.method != "DELETE":
        return JsonResponse({"error": "Invalid Method"}, status=405)

    # 2. Map game types to Models
    model_map = {
        "FCM": FCM_Game,
        "HC": HC_Game,
        "Bus": Bus_Game,
        "TGZ": TGZ_Game,
        "CNS": Game,  # Now using unified Game model
        "AQY": AQY_Game,
        "IND": IND_Game,
        "KFW": KFW_Game,
        "WEB": Game,  # Now using unified Game model
    }

    model = model_map.get(game_type)
    if not model:
        raise Http404("Invalid Game Type")

    # 3. Parse Data
    try:
        data = json.loads(request.body)
        game_id = data.get("gameID")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # 4. Fetch Game
    if usesUnifiedGameModel(game_type):
        current_game = model.objects.filter(id=game_id, gameCode=game_type).first()
    else:
        current_game = model.objects.filter(id=game_id).first()
    if not current_game:
        return JsonResponse({"noGame": True})

    # 5. Logic execution
    if data.get("action") == "deleteTrgGame":
        if request.user.username == "admin":
            status = current_game.gameStatus
            current_game.delete()

            messages.success(request, f"Game Deleted. Game: {game_type} ID: {game_id}")
            return JsonResponse(
                {
                    "gameType": game_type,
                    "gameID": game_id,
                    "gameStatus": status,
                }
            )

        # 6. Webhook for unauthorized attempts
        log_unauthorized_attempt(request)

    return JsonResponse({"error": "Unauthorized or Invalid Action"}, status=403)


def log_unauthorized_attempt(request):
    message = (
        "=== DELETE GAME HACK ATTEMPT ===\n"
        f"User: {request.user.username}\n"
        f"Path: {request.path}\n"
        f"Email: {request.user.email}\n"
    )
    try:
        requests.post(
            f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
            data={"content": message},
            timeout=5,
        )
    except Exception as e:
        print(f"Webhook failed: {e}")


def about(request):
    showLangs = False
    if (
        request.user.username == "admin"
        or request.user.username == "庄生"
        or request.user.username == "Salfuman"
        or request.user.username == "mhmnz2"
    ):
        showLangs = True

    return render(request, "Lobby/about.html", {"showLangs": showLangs})


@login_required
def newGamesPage(request):
    return render(request, "Lobby/newGames.html")


@login_required
def newMiniTournaments(request):
    return render(request, "Lobby/newMiniTournaments.html")


@login_required
def fcmNewCode(request):
    return render(request, "Lobby/fcmNewCode.html")


def changelog_view(request):
    allChanges = changelog.objects.order_by("-timestamp").all()

    if request.user.username == "admin":
        # create object of form
        changelogFormVar = changelogForm(request.POST or None, request.FILES or None)

        # check if form data is valid
        if changelogFormVar.is_valid():
            # save the form data to model
            changelogFormVar.save()
            message = changelogFormVar.cleaned_data["update"]
            requests.post(
                f"https://discord.com/api/webhooks/{config('WEBHOOK_DISCORD_UPDATES')}",
                data={"content": message},
            )

        return render(
            request,
            "Lobby/changelog.html",
            {"allChanges": allChanges, "changelogFormVar": changelogFormVar},
        )
    return render(request, "Lobby/changelog.html", {"allChanges": allChanges})


def contact(request):
    return render(request, "Lobby/contact.html")


def handler404(request, exception):
    if not request.path.endswith("/") and not request.path.startswith("/nextGame"):
        print("Adding trailing slash to 404 URL: " + request.path)
        return HttpResponsePermanentRedirect(request.path + "/")
    data = exception.args
    exceptionData = data[0]
    if exceptionData == "Game does not exist":
        messages.error(request, gettext(exceptionData))
    # if data:
    #    return HttpResponseNotFound(data[0])
    try:
        message = ""
        message += "=== 404 ===================================\n"
        message += "404 ERROR\n"
        if request.user.is_authenticated:
            message += "User: " + request.user.username + "\n"
        else:
            message += "User Not Logged In\n"
        message += "Path: " + request.path + "\n"
        message += "Method: " + request.method + "\n"
        message += "User Is Authenticated: " + str(request.user.is_authenticated) + "\n"
        if request.user.is_authenticated:
            message += "Email: " + request.user.email + "\n"

        if (
            request.user.is_authenticated
            and request.user.username != "Gamer"
            and request.user.username != "MMYCC"
        ):
            requests.post(
                f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                data={"content": message},
            )
    except Exception as e:
        print("404 handler error: " + str(e))

    return render(
        request,
        "Lobby/404.html",
        {
            # "exception": exception
        },
    )


def handler500(request, exception=None, *_, **_k):
    try:
        message = "=== 500 ===================================\n"
        message += "500 ERROR\n"
        if request.user.is_authenticated:
            message += "User: " + request.user.username + "\n"
            message += "Email: " + request.user.email + "\n"
        else:
            message += "User Not Logged In\n"
        message += "Path: " + request.path + "\n"
        message += "Method: " + request.method + "\n"
        message += "User Is Authenticated: " + str(request.user.is_authenticated) + "\n"

        # Get the traceback information for the exception
        exception_traceback = traceback.format_exc()
        message += "\nException Traceback:\n" + exception_traceback + "\n"

        requests.post(
            f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
            data={"content": message},
        )
    except Exception as e:
        # Handle any exceptions during error reporting
        print("Error reporting failed:", str(e))
        try:
            requests.post(
                f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                data={"content": str(e)},
            )
        except:
            print("DOUBLE FAILURE in 500")

    return render(
        request,
        "Lobby/500.html",
        {
            # "exception": exception
        },
    )


@login_required
def next_game_redirect(request):
    # 1. Get current context from Vue query params
    try:
        current_game_id = int(request.GET.get("current_id"))
        current_game_code = request.GET.get("current_code")  # e.g., 'FCM'
    except (TypeError, ValueError):
        return redirect("/")

    currentGamesList = list(
        chain(
            *[
                model.objects.filter(
                    Q(allPlayers=request.user),
                    Q(gameStatus="ACTIVE"),
                    ~Q(missingPlayers=request.user),
                )
                for model in GAME_MODELS
            ]
        )
    )
    currentGamesList.sort(key=lambda instance: instance.latestUpdate, reverse=True)

    # Filter currentGamesList based on isMyMove function
    filteredGamesList = [
        game for game in currentGamesList if game.quickIsMyMove(request.user.username)
    ]

    # Handle cases when there are no filtered games
    if not filteredGamesList:
        return redirect("/")
    if len(filteredGamesList) == 1:
        nextGame = filteredGamesList[0]  # .serialize()
        nextID = nextGame.id
        if nextID == current_game_id:
            return redirect("/")
        else:
            nextGameCode = nextGame.getGameCode()
            return redirect(f"/{nextGame.getGameCode()}/{nextGame.id}/")

    # Get the index of the game with the specified game_id
    index = next(
        (
            i
            for i, game in enumerate(filteredGamesList)
            if game.id == current_game_id and game.getGameCode() == current_game_code
        ),
        None,
    )

    # Determine the next game details based on the index
    if index is None or index >= len(filteredGamesList) - 1:
        nextGame = filteredGamesList[0]  # .serialize()
    else:
        nextGame = filteredGamesList[index + 1]  # .serialize()

    # Construct the nextURL using the next game details
    return redirect(f"/{nextGame.getGameCode()}/{nextGame.id}/")


def password_reset_request(request):
    if request.method == "POST":
        password_reset_form = PasswordResetFormCustom(request.POST)
        if password_reset_form.is_valid():
            data = password_reset_form.cleaned_data["email"]
            associated_users = User.objects.filter(Q(email=data))
            if associated_users.exists():
                for user in associated_users:
                    current_site = get_current_site(request)
                    subject = gettext("Password Reset Requested")
                    email_template_name = "Lobby/password/password_reset_email.txt"
                    c = {
                        "email": user.email,
                        "domain": current_site.domain,
                        "site_name": "Website",
                        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
                        "user": user,
                        "token": default_token_generator.make_token(user),
                        "protocol": "https",
                        "username": user.username,
                    }
                    email = render_to_string(email_template_name, c)
                    try:
                        send_mail(
                            subject,
                            email,
                            "OnlineBoardGamers@gmail.com",
                            [user.email],
                            fail_silently=False,
                        )
                    except BadHeaderError:
                        return HttpResponse("Invalid header found.")

                    messages.success(
                        request,
                        gettext(
                            "An email with password reset instructions has been sent to your inbox. Please check spam folders"
                        ),
                    )
                    return redirect("/")
            else:
                messages.error(request, gettext("No user found with this email"))
        else:
            messages.error(request, gettext("Please enter a valid email address"))
    password_reset_form = PasswordResetFormCustom()
    return render(
        request=request,
        template_name="Lobby/password/password_reset.html",
        context={"password_reset_form": password_reset_form},
    )


def csrf_failure(request, reason=""):
    user = get_user(request)
    username = user.username if user.is_authenticated else "Anonymous"
    redirect_url = request.META.get("HTTP_REFERER", "unknown")  # Get the referring URL

    # log_message = f"CSRF failure: User: {username}, Redirect from: {redirect_url}, Reason: {reason}"
    # logger.warning(log_message)

    logger.warning(
        f"CSRF failure: User: {username}, Redirect from: {redirect_url}, Reason: {reason}"
    )
    logger.debug(f"Request META: {request.META}")
    logger.debug(f"CSRF Cookie: {request.COOKIES.get('csrftoken')}")

    messages.error(
        request,
        gettext(
            "Authentification problem - possibly using another browser tab. Please login here"
        ),
    )
    return render(request, "Lobby/login.html")


@login_required
def stats(request):
    # Try to get data from cache first
    stats_data = cache.get("global_stats")
    if not stats_data:
        # These 2 queries only run once every 5 minutes
        date_from = timezone.now() - timezone.timedelta(hours=24)

        stats_data = {
            "totalUsers": User.objects.count(),
            "userActivity": UserVisit.objects.filter(
                timestamp__gte=date_from
            ).aggregate(total=Count("user_id", distinct=True))["total"],
        }
        cache.set("global_stats", stats_data, 300)  # Cache for 300 seconds

    # Unpack cached data
    totalUsers = stats_data["totalUsers"]
    userActvitiy = stats_data["userActivity"]
    # Initialize counts and lists
    game_counts = []
    finished_game_counts = []
    latestGames = []
    latestGamesFinished = []

    excluded_names = ["SHADOW", "FcmAI"]

    # Handle all unified model games (CNS, WEB, etc.)
    for game_code in ['CNS', 'WEB']:  # Add more as they migrate
        counts_key = f"counts_Game_{game_code}"
        counts = cache.get(counts_key)

        if not counts:
            counts = {
                "active": Game.objects.filter(gameCode=game_code, gameStatus="ACTIVE")
                .exclude(players__player__username__in=excluded_names)
                .distinct()
                .count(),
                "finished": Game.objects.filter(gameCode=game_code, gameStatus="FINISHED")
                .exclude(players__player__username__in=excluded_names)
                .distinct()
                .count(),
            }
            cache.set(counts_key, counts, 60)

        game_counts.append(counts["active"])
        finished_game_counts.append(counts["finished"])

        # Fetch latest games
        latestGames.extend(
            Game.objects.filter(gameCode=game_code, gameStatus="ACTIVE")
            .exclude(players__player__username__in=excluded_names)
            .distinct()
            .order_by("-latestUpdate")[:10]
        )

        latestGamesFinished.extend(
            Game.objects.filter(gameCode=game_code, gameStatus="FINISHED")
            .exclude(players__player__username__in=excluded_names)
            .distinct()
            .order_by("-latestUpdate")[:10]
        )

    # Loop through GAME_MODELS once to gather counts and latest games
    for game_model in GAME_MODELS:
        #### NOTE - DO NOT USE PRE-FETCHES FOR THIS FUNCTION
        # To get the latest 10 games, we need to load 10x game models. But we only want to serialise the latest 10
        # So it's actually less hits just to get the latest 10 games for each model without prefetch (~150 hits)
        # Get counts (1 hit per model)
        model_name = game_model.__name__

        # Cache counts per model to avoid heavy COUNT(*) on every page load
        counts_key = f"counts_{model_name}"
        counts = cache.get(counts_key)

        if not counts:
            counts = {
                "active": game_model.objects.filter(gameStatus="ACTIVE")
                .exclude(allPlayers__username__in=excluded_names)
                .count(),
                "finished": game_model.objects.filter(gameStatus="FINISHED")
                .exclude(allPlayers__username__in=excluded_names)
                .count(),
            }
            cache.set(counts_key, counts, 60)  # Cache counts for 60 seconds

        game_counts.append(counts["active"])
        finished_game_counts.append(counts["finished"])

        # Fetch latest games
        # We only fetch 10 per model, then slice the combined list to 10 at the end
        latestGames.extend(
            game_model.objects.filter(gameStatus="ACTIVE")
            .exclude(allPlayers__username__in=excluded_names)
            .order_by("-latestUpdate")[:10]
        )

        latestGamesFinished.extend(
            game_model.objects.filter(gameStatus="FINISHED")
            .exclude(allPlayers__username__in=excluded_names)
            .order_by("-latestUpdate")[:10]
        )

    # Calculate grand totals
    totalGames = sum(game_counts)
    finishedGames = sum(finished_game_counts)

    # Sort the latest games by latestUpdate
    latestGames.sort(key=lambda game: game.latestUpdate, reverse=True)
    latestGamesFinished.sort(key=lambda game: game.latestUpdate, reverse=True)
    # latestGames.sort(key=lambda game: game['latestUpdate'], reverse=True)

    # Get the top 10 games
    tenGamesList = latestGames[:10]
    tenGamesListFininshed = latestGamesFinished[:10]

    # Serialize the games into JSON
    tenGamesJSON = [SF_fastSerializeGame(game, request.user) for game in tenGamesList]
    tenGamesFinishedJSON = [
        SF_fastSerializeGame(game, request.user) for game in tenGamesListFininshed
    ]

    # 4. JSON Data Loading (Optimized file reading)
    def load_stat_json(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    base_path = "./Lobby/stats/"

    # Fair Play
    fairPlayArr = load_stat_json(f"{base_path}fairPlayArr_E.json")

    # Win Arrays (Batch loading)
    win_data = {
        "winArr": load_stat_json(f"{base_path}winArr_E.json"),
        "win3mArr": load_stat_json(f"{base_path}win3mArr_E.json"),
        "win1mArr": load_stat_json(f"{base_path}win1mArr_E.json"),
    }

    # Player-specific Win Arrays
    p_counts = [2, 3, 4, 5, 6]
    p_stats = {}
    for p in p_counts:
        p_stats[f"winArr{p}p"] = load_stat_json(f"{base_path}winArr{p}p_E.json")
        p_stats[f"win3mArr{p}p"] = load_stat_json(f"{base_path}win3mArr{p}p_E.json")
        p_stats[f"win1mArr{p}p"] = load_stat_json(f"{base_path}win1mArr{p}p_E.json")

    games = ["FCM", "HC", "Bus", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB"]  # , "RNB"]

    return render(
        request,
        "Lobby/stats.html",
        {
            "totalUsers": totalUsers,
            "game_counts": game_counts,
            "totalGames": totalGames,
            "finishedGames": finishedGames,
            "finished_game_counts": finished_game_counts,
            "tenGames": tenGamesJSON,
            "tenGamesFinished": tenGamesFinishedJSON,
            "userActvitiy": userActvitiy,
            "games": games,
            # Fair Play
            "fairPlayArr": fairPlayArr,
            **win_data,
            **p_stats,
        },
    )


def donate(request):
    return render(request, "Lobby/donate/donate.html")


def donate_cancel(request):
    messages.success(request, gettext("Thank you for taking a look"))
    return render(request, "Lobby/donate/donate.html")


def donate_success(request):
    return render(request, "Lobby/donate/donate_success.html")


def indexListType(request, listType):
    request.session["listType"] = listType
    return redirect("index")


def index(request):
    if not request.user.is_authenticated:
        return render(request, "Lobby/index.html")

    # start_time = time.time()
    user = request.user
    user_id = user.id
    # show_timestamps = user.username in ["admin", "DodgerB"]
    recent_cutoff = (timezone.now() - timedelta(days=15)).timestamp() * 1000

    start_time = time.time()

    # def print_timestamp(label):
    #    if show_timestamps:
    #        print(
    #            f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}"
    #        )

    list_type = request.session.pop("listType", "current")
    tournament_models = {
        "FCM": FCM_Tournament,
        "HC": HC_Tournament,
        "Bus": Bus_Tournament,
        "AQY": AQY_Tournament,
        "IND": IND_Tournament,
    }

    # --- Step 1: Optimized Blacklist (2 Queries total) ---
    profile = request.user.profile
    blacklisted_players_ids = set(
        profile.blacklistedPlayers.values_list("id", flat=True)
    )

    # Who blocked me?
    blocked_by_user_ids = set(
        Profile.objects.filter(blacklistedPlayers=request.user).values_list(
            "user_id", flat=True
        )
    )

    # print_timestamp("Step 1: Blacklists fetched")

    # --- Step 2: Deep Prefetching (Essential for Step 3) ---
    all_user_games = []

    # Load all unified model games at once
    from django.db.models import Exists, OuterRef
    
    # For unified Game model, check through GamePlayer
    is_player = Game.objects.filter(
        id=OuterRef("id"),
        players__player=user
    ).values("id")

    is_invited = Game.objects.filter(
        id=OuterRef("id"),
        invitedPlayers=user
    ).values("id")

    unified_query = Game.objects.annotate(
        user_is_player=Exists(is_player),
        user_is_invited=Exists(is_invited)
    ).filter(
        Q(user_is_player=True)
        | Q(user_is_invited=True)
        | Q(gameStatus="AVAILABLE", created__gte=recent_cutoff)
    )

    # Defer large fields
    unified_query = unified_query.defer(
        "gameData",
        "rewindData",
        "rewindTempData",
        "chatData",
    )

    # Prefetch related data
    unified_query = unified_query.select_related("creator").prefetch_related(
        "players__player",
        "invitedPlayers"
    )

    all_user_games.extend(list(unified_query.distinct()))

    for model in GAME_MODELS:
        pass
        # Prepare subqueries for existence checks (much faster than JOINs)
        is_player = model.objects.filter(id=OuterRef("id"), allPlayers=user).values(
            "id"
        )
        is_invited = model.objects.filter(
            id=OuterRef("id"), invitedPlayers=user
        ).values("id")

        # 1. Start with a lean queryset
        query = model.objects.annotate(
            user_is_player=Exists(is_player), user_is_invited=Exists(is_invited)
        ).filter(
            Q(user_is_player=True)
            | Q(user_is_invited=True)
            | Q(
                gameStatus="AVAILABLE", created__gte=recent_cutoff
            )  # Don't look at old available games
        )

        # 2. Defer huge fields that are NOT needed for the lobby listing
        # This is the single biggest "win" for memory and speed
        #query = query.defer(
        #    "gameData", "rewindData", "rewindTempData", "chatData", "kickoutFlexiData"
        #)

        # deferrung kickoutFlexiData seems to cause occasional race conditions and lobby not loading
        # when
        query = query.defer(
            "gameData",
            "rewindData",
            "rewindTempData",
            "chatData",
        )

        # 3. Optimized Joins
        winner_is_m2m = model._meta.get_field("winner").many_to_many
        query = query.select_related("creator")

        if not winner_is_m2m:
            query = query.select_related("winner")

        # 4. Prefetch M2Ms needed for serialization
        prefetches = [
            "allPlayers",
            "missingPlayers",
            "invitedPlayers",
            "playersWithChatNotification",
        ]
        if winner_is_m2m:
            prefetches.append("winner")

        all_user_games.extend(list(query.prefetch_related(*prefetches).distinct()))

    all_user_games.sort(key=lambda game: game.latestUpdate, reverse=True)

    # print_timestamp("Step 2: Game queries complete")

    # --- Step 3: Categorize (Target: 0 new queries) ---
    available_games, current_games, waiting_games, invitations_games, finished_games = (
        [],
        [],
        [],
        [],
        [],
    )
    my_move_games_data = []
    current_chat = finished_chat = False

    for game in all_user_games:
        # 1. Categorization Logic using local memory
        status = game.gameStatus
        if status == "FINISHED" and len(finished_games) >= 10:
            continue

        # Blacklist check (already optimized)
        if (
            game.creator_id in blacklisted_players_ids
            or game.creator_id in blocked_by_user_ids
        ):
            # We still allow involved games even if blacklisted
            is_blacklisted_game = True
        else:
            is_blacklisted_game = False

        # Access prefetched data - handle both unified and legacy models
        is_unified = isinstance(game, Game)

        if is_unified:
            # Unified Game model
            all_game_players = game.players.exclude(is_kicked=True).all()
            all_p_ids = {gp.player.id for gp in all_game_players if gp.player}
            inv_p_ids = {p.id for p in game.invitedPlayers.all()}
            miss_p_ids = {gp.player.id for gp in all_game_players if gp.is_missing and gp.player}
        else:
            # Legacy model
            all_p_ids = {p.id for p in game.allPlayers.all()}
            inv_p_ids = {p.id for p in game.invitedPlayers.all()}
            miss_p_ids = {p.id for p in game.missingPlayers.all()}

        is_involved = user_id in all_p_ids
        is_invited = user_id in inv_p_ids

        # 2. Only serialize if the game meets our visibility criteria
        # This saves CPU cycles on games the user won't see
        try:
            serialized = SF_fastSerializeGame(game, user)
        except FCM_Game.DoesNotExist:
            SN_sendAdminErrorMessage(request, f"Game {game.getGameCode() if hasattr(game, 'getGameCode') else game.gameCode} {game.id} does not exist - trying to serialize in lobby")
            continue

        if is_involved:
            if status == "ACTIVE" and user_id not in miss_p_ids:
                current_games.append(serialized)
                if serialized["myMove"]:
                    my_move_games_data.append(
                        [serialized["gameCode"], serialized["gameID"]]
                    )
                if serialized["chatNotification"]:
                    current_chat = True
            elif status in ["WAITING", "AVAILABLE", "PRIVATE"]:
                waiting_games.append(serialized)
            elif status == "FINISHED":
                finished_games.append(serialized)
                if serialized["chatNotification"]:
                    finished_chat = True

        elif not is_blacklisted_game and status == "AVAILABLE":
            available_games.append(serialized)

        elif is_invited and status in ["WAITING", "PRIVATE"]:
            invitations_games.append(serialized)

    # print_timestamp("Step 3: Categorization complete")

    # --- Step 4: Mini Tournaments (Use select_related to save hits) ---
    # Combine these or use more prefetching if serialize() hits related objects
    available_MT_qs = (
        Mini_Tournaments.objects.filter(tournamentStatus="OP")
        .select_related("creator")
        .order_by("-created")
    )
    available_MT = [item.serialize() for item in available_MT_qs]

    current_MT_qs = Mini_Tournaments.objects.filter(
        tournamentStatus="IP", startingPlayers=user
    ).select_related("creator")
    current_MT = [item.serialize() for item in current_MT_qs]

    # print_timestamp("Step 4: MT fetched")

    # --- Step 5: Caching Tournament Availability ---
    cache_key = f"lobby_main_tournaments_check"
    available_tournaments = cache.get(cache_key)
    if available_tournaments is None:
        available_tournaments = [
            name
            for name, model in tournament_models.items()
            if model.objects.filter(tournamentStatus="OP").exists()
        ]
        main_tours = list(
            Main_Tournament.objects.filter(tournamentStatus="OP").values_list(
                "gameCode", flat=True
            )
        )
        available_tournaments = list(set(available_tournaments + main_tours))
        cache.set(cache_key, available_tournaments, 60)  # Cache for 1 minute

    # print_timestamp("Final prep complete")

    # finished_games = QueryableGameAllPlayers.objects.filter(
    #    Q(player_id=user_id) &
    #    Q(queryable_game__gameStatus="FINISHED")
    #    ).prefetch_related("queryable_game__winners__winner").prefetch_related("queryable_game__all_players__player").order_by("-queryable_game__latestUpdate")[:10]

    return render(
        request,
        "Lobby/lobby.html",
        {
            "availableGamesList": available_games,
            "currentGamesList": current_games,
            "waitingGamesList": waiting_games,
            "invitaionsGamesList": invitations_games,
            "finishedGamesList": finished_games,
            "availableCount": len(available_games) + len(available_MT),
            "currentCount": len(current_games),
            "waitingCount": len(waiting_games),  # Add MT count if needed
            "invitationsCount": len(invitations_games),
            "finishedCount": len(finished_games),
            "listType": list_type,
            "myMoveGames": len(my_move_games_data),
            "availableTournaments": available_tournaments,
            "showLangs": user.username in {"admin", "庄生", "Salfuman", "mhmnz2"},
            "currentChat": current_chat,
            "finishedChat": finished_chat,
            "myMoveGamesData": my_move_games_data,
            "available_MT": available_MT,
            "current_MT": current_MT,
        },
    )


@csrf_exempt
def login_view(request):
    if request.method == "POST":
        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            request.session.modified = True  # Force session save

            profile = Profile.objects.get(user=user)
            language_code = profile.profileLanguage
            translation.activate(language_code)

            nxt = request.POST.get("next", None)  # Use .get() to avoid KeyError

            if nxt is None or nxt == "":  # Check if nxt is None or empty
                response = HttpResponseRedirect(reverse("index"))
            elif not url_has_allowed_host_and_scheme(
                url=nxt,
                allowed_hosts={request.get_host()},
                require_https=request.is_secure(),
            ):
                logger.warning(
                    f"{user.username}: Possible redirect to unsafe URL: {nxt}"
                )  # Log the potentially unsafe redirect
                response = HttpResponseRedirect(reverse("index"))
            else:
                response = HttpResponseRedirect(nxt)

            response.set_cookie(settings.LANGUAGE_COOKIE_NAME, language_code)
            return response
        else:
            try:
                user = User.objects.get(username=request.POST["username"])
                if not user.is_active:
                    messages.error(
                        request,
                        (
                            gettext(
                                "Account inactive - check your email for email verification, or contact the webmaster"
                            )
                        ),
                    )
                    return render(request, "Lobby/login.html")
            except User.DoesNotExist:
                print("********** USER DOES NOT EXIST ERROR")
                username = request.POST.get("username", "")
                logger.warning(f"Login attempt with non-existent user: {username}")
                # Check if username contains '@' to suggest using username instead of email
                if "@" in username:
                    messages.error(
                        request,
                        gettext(
                            "Invalid username / password. Please use your username, not your email address."
                        ),
                    )
                else:
                    messages.error(request, gettext("Invalid username / password"))
                return render(request, "Lobby/login.html")
            except Exception as e:
                print("********** OTHER EXCEPTION")
                print(e)
                logger.exception("Unexpected error during login:")
                messages.error(request, gettext("Invalid username / password"))
                return render(request, "Lobby/login.html")
    else:
        response = render(request, "Lobby/login.html")
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        return response

    return render(request, "Lobby/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


@login_required
def FCMmapEditor(request):
    if request.method == "POST":
        return render(
            request, "Lobby/FCMmapEditor.html", {"mapData": request.POST["mapData"]}
        )

    else:
        return render(request, "Lobby/FCMmapEditor.html")


@login_required
def TGZmapEditor(request):
    if request.method == "POST":
        return render(
            request, "Lobby/TGZmapEditor.html", {"mapData": request.POST["mapDataTGZ"]}
        )

    else:
        return render(request, "Lobby/TGZmapEditor.html")


@login_required
def AQYmapEditor(request):
    if request.method == "POST":
        return render(
            request, "Lobby/AQYmapEditor.html", {"mapData": request.POST["mapDataAQY"]}
        )

    else:
        return render(request, "Lobby/AQYmapEditor.html")


@login_required
def profile(request):
    if request.method == "POST":
        if request.POST["action"] == "changePassword":
            form = PasswordChangeCustomForm(request.user, request.POST)
            if form.is_valid():
                user = form.save()
                update_session_auth_hash(request, user)  # Important!
                messages.success(request, gettext("Your password has been changed"))
                return redirect("profile")
            else:
                error_messages = []
                for field, errors in form.errors.items():
                    for error in errors:
                        if isinstance(error, str):
                            error_messages.append(error)
                        else:
                            error_messages.append(
                                str(error)
                            )  # Convert to string if it's not already

                error_string = " ".join(error_messages)
                messages.error(request, error_string)
                return redirect("profile")
        elif request.POST["action"] == "updateProfileFavourites":
            profile = Profile.objects.get(user=request.user)
            profile.preferredRestaurantColour = request.POST["fcmResto"]
            profile.preferredHCcolour = request.POST["hcColour"]
            try:
                request.POST["highContrastBoardItems"]
                profile.highContrastBoardItems = True
            except Exception:
                profile.highContrastBoardItems = False

            profile.preferredBusColour = request.POST["busColour"]
            profile.preferredBusBoard = request.POST["BusBoard"]

            profile.preferredTGZcolour = request.POST["tgzColour"]
            try:
                request.POST["TGZminimalText"]
                profile.TGZminimalText = True
            except Exception:
                profile.TGZminimalText = False

            preferredCNScolour = (
                request.POST["cnsColour"] if request.POST["cnsColour"] != "-1" else None
            )
            profile.preferredCNScolour = preferredCNScolour

            KFWoptions = []
            KFWoptions.append(int(request.POST["kfwColour"]))
            profile.preferredKFWoptions = json.dumps(KFWoptions, separators=(",", ":"))

            WEBoptions = []
            WEBoptions.append(int(request.POST["webColour"]))
            profile.preferredWEBoptions = json.dumps(WEBoptions, separators=(",", ":"))

            profile.save()

            messages.success(
                request,
                gettext("Your colour preferences have been updated successfully"),
            )
            return redirect(to="profile")

        elif request.POST["action"] == "updateProfileNotifications":
            profile = Profile.objects.get(user=request.user)

            profile.liveNotification = request.POST["liveNotif"]

            try:
                request.POST["sendEmails"]
                profile.sendEmailNotificationOnTurn = True
            except Exception:
                profile.sendEmailNotificationOnTurn = False

            emailNotifications = [
                int(request.POST["yourTurnEmail"]),
                int(request.POST["gameInviteEmail"]),
                int(request.POST["turnExpiredEmail"]),
                int(request.POST["tournamentGameStartEmail"]),
                int(request.POST["tournamentWinEmail"]),
                int(request.POST["inviteDeclineEmail"]),
                int(request.POST["gameStartEmail"]),
                int(request.POST["gameEndEmail"]),
                int(request.POST["twoHourReminderEmail"]),
                int(request.POST["dailyReminderEmail"]),
                int(request.POST["tournamentOpenEmail"]),
            ]
            profile.emailNotifications = json.dumps(
                emailNotifications, separators=(",", ":")
            )

            profile.save()

            submission_source = request.POST.get("submissionSource", "")

            if submission_source == "webhookTest":
                messages.success(
                    request,
                    gettext(
                        "A test message has been sent and your notification preferences have been updated successfully"
                    ),
                )
            else:
                messages.success(
                    request,
                    gettext(
                        "Your notification preferences have been updated successfully"
                    ),
                )
            return redirect(to="profile")
    else:
        profile = Profile.objects.get(user=request.user)
        if profile.stopEmailsUntil is not None:
            now_minutes = round(time.time() / 60)
            if profile.stopEmailsUntil <= now_minutes:
                profile.stopEmailsUntil = None
                profile.save()
            stop_emails_until = profile.stopEmailsUntil
        else:
            stop_emails_until = -1
        profile_form = UpdateProfileForm(instance=request.user.profile)
        favColour = profile.preferredRestaurantColour
        if favColour == "":
            favColour = -1
        favHCcolour = profile.preferredHCcolour
        if favHCcolour == "":
            favHCcolour = -1
        highContrastBoardItems = profile.highContrastBoardItems

        preferredCNScolour = (
            profile.preferredCNScolour if profile.preferredCNScolour is not None else -1
        )

        preferredKFWoptions = (
            json.loads(profile.preferredKFWoptions)
            if profile.preferredKFWoptions != ""
            and profile.preferredKFWoptions is not None
            else [-1]
        )
        favKFWcolour = preferredKFWoptions[0]

        preferredWEBoptions = (
            json.loads(profile.preferredWEBoptions)
            if profile.preferredWEBoptions != ""
            and profile.preferredWEBoptions is not None
            else [-1]
        )
        favWEBcolour = preferredWEBoptions[0]

        sendEmails = profile.sendEmailNotificationOnTurn

        liveNotification = profile.liveNotification

        passwordResetForm = PasswordChangeCustomForm(request.user)

        webhooks = (
            json.loads(profile.webhooks)
            if profile.webhooks != "" and profile.webhooks is not None
            else []
        )
        for entry in webhooks:
            if entry[0] in SR_WEBHOOK_CHOICES:
                entry[0] = SR_WEBHOOK_CHOICES[entry[0]]

        emailNotifications = json.loads(profile.emailNotifications)
        while len(emailNotifications) < 11:
            emailNotifications.append(0)
        yourTurnEmail = emailNotifications[0]
        gameInviteEmail = emailNotifications[1]
        turnExpiredEmail = emailNotifications[2]
        tournamentGameStartEmail = emailNotifications[3]
        tournamentWinEmail = emailNotifications[4]
        inviteDeclineEmail = emailNotifications[5]
        gameStartEmail = emailNotifications[6]
        gameEndEmail = emailNotifications[7]
        twoHourReminderEmail = emailNotifications[8]
        dailyReminderEmail = emailNotifications[9]
        tournamentOpenEmail = emailNotifications[10]

        blacklisted_players = [
            player.username.strip() for player in profile.blacklistedPlayers.all()
        ]

        return render(
            request,
            "Lobby/profile.html",
            {
                "form": profile_form,
                "form2": passwordResetForm,
                "favColour": favColour,
                "favHCcolour": favHCcolour,
                "highContrastBoardItems": highContrastBoardItems,
                "sendEmails": sendEmails,
                "liveNotification": liveNotification,
                "username": request.user.username,
                "email": request.user.email,
                "preferredBusColour": profile.preferredBusColour,
                "preferredBusBoard": profile.preferredBusBoard,
                "favTGZcolour": profile.preferredTGZcolour,
                "favCNScolour": preferredCNScolour,
                "favKFWcolour": favKFWcolour,
                "favWEBcolour": favWEBcolour,
                "TGZminimalText": profile.TGZminimalText,
                "webhooks": webhooks,
                "yourTurnEmail": yourTurnEmail,
                "gameInviteEmail": gameInviteEmail,
                "turnExpiredEmail": turnExpiredEmail,
                "tournamentGameStartEmail": tournamentGameStartEmail,
                "tournamentWinEmail": tournamentWinEmail,
                "inviteDeclineEmail": inviteDeclineEmail,
                "gameStartEmail": gameStartEmail,
                "gameEndEmail": gameEndEmail,
                "twoHourReminderEmail": twoHourReminderEmail,
                "dailyReminderEmail": dailyReminderEmail,
                "tournamentOpenEmail": tournamentOpenEmail,
                "blacklistedPlayers": blacklisted_players,
                "stop_emails_until": stop_emails_until,  # -1 if not set
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def profileAQY(request):
    if request.method == "POST":
        profile = Profile.objects.get(user=request.user)

        AQYoptions = []
        AQYoptions.append(int(request.POST["aqyColour"]))
        AQYoptions.append(int(request.POST["mapType"]))
        AQYoptions.append(int(request.POST["resIcon"]))
        AQYoptions.append(int(request.POST["pullResToMan"]))
        AQYoptions.append(int(request.POST["keepForestUnderWoodRes"]))
        AQYoptions.append(int(request.POST["showPollutionUnderRes"]))
        AQYoptions.append(int(request.POST["housesInNumOrder"]))

        profile.preferredAQYoptions = json.dumps(AQYoptions, separators=(",", ":"))

        profile.save()

        messages.success(
            request,
            gettext("Your Antiquity preferences have been updated successfully"),
        )
        return redirect(to="profileAQY")

    else:
        profile = Profile.objects.get(user=request.user)
        preferredAQYoptions = (
            json.loads(request.user.profile.preferredAQYoptions)
            if request.user.profile.preferredAQYoptions != ""
            else [-1, 1, 0, 0, 1, 1, 0]
        )

        # [colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes, showPollutionUnderRes, housesInNumOrder]

        return render(
            request,
            "Lobby/profileAQY.html",
            {
                "colour": preferredAQYoptions[0],
                "mapType": preferredAQYoptions[1],
                "resIcon": preferredAQYoptions[2],
                "pullResToMan": preferredAQYoptions[3],
                "keepForestUnderWoodRes": preferredAQYoptions[4],
                "showPollutionUnderRes": preferredAQYoptions[5],
                "housesInNumOrder": preferredAQYoptions[6],
            },
        )


@login_required
def profileIND(request):
    if request.method == "POST":
        profile = Profile.objects.get(user=request.user)

        INDoptions = []
        INDoptions.append(int(request.POST["indColour"]))
        INDoptions.append(int(request.POST["mapType"]))
        INDoptions.append(int(request.POST["citySizeColour"]))
        INDoptions.append(int(request.POST["indOutline"]))
        INDoptions.append(int(request.POST["goodsIcon"]))
        INDoptions.append(int(request.POST["shipIcon"]))

        profile.preferredINDoptions = json.dumps(INDoptions, separators=(",", ":"))

        profile.save()

        messages.success(
            request,
            gettext("Your Indonesia preferences have been updated successfully"),
        )
        return redirect(to="profileIND")

    else:
        profile = Profile.objects.get(user=request.user)
        preferredINDoptions = (
            json.loads(request.user.profile.preferredINDoptions)
            if request.user.profile.preferredINDoptions != ""
            else [-1, 0, 0, 1, 1, 1]
        )

        if len(preferredINDoptions) < 6:
            preferredINDoptions.extend([1] * (6 - len(preferredINDoptions)))

        # [colour, mapType, citySizeColour, indOutline]

        return render(
            request,
            "Lobby/profileIND.html",
            {
                "colour": preferredINDoptions[0],
                "mapType": preferredINDoptions[1],
                "citySizeColour": preferredINDoptions[2],
                "indOutline": preferredINDoptions[3],
                "goodsIcon": preferredINDoptions[4],
                "shipIcon": preferredINDoptions[5],
            },
        )


@login_required
def createBusPage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "Bus", Bus_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createBus.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Bus_Game.objects.get(id=gameID)
        except Bus_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createBus.html",
            {
                "fillData": True,
                "gameName": currentGame.getGameName(),
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": currentGame.startingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createCNSpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "CNS", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createCNS.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode='CNS')
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        presenter = currentGame.presenter()
        all_players = currentGame.players.exclude(is_kicked=True, player=request.user).select_related('player')
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        return render(
            request,
            "Lobby/createCNS.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createAQYpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "AQY", AQY_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createAQY.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = AQY_Game.objects.get(id=gameID)
        except AQY_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        return render(
            request,
            "Lobby/createAQY.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "startingMap": json.loads(currentGame.startingMap),
                "mapData": json.loads(currentGame.startingMap),
                "experienced": experienced,
            },
        )
    elif request.method == "POST":
        messages.success(request, (gettext("Game creation for selected map")))
        return render(
            request,
            "Lobby/createAQY.html",
            {"experienced": experienced, "mapData": request.POST["mapData"]},
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createINDpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "IND", IND_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createIND.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = IND_Game.objects.get(id=gameID)
        except IND_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        return render(
            request,
            "Lobby/createIND.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createKFWpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "KFW", IND_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createKFW.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = KFW_Game.objects.get(id=gameID)
        except KFW_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        return render(
            request,
            "Lobby/createKFW.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createWEBpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "WEB", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createWEB.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode='WEB')
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        presenter = currentGame.presenter()
        all_players = currentGame.players.exclude(is_kicked=True, player=request.user).select_related('player')
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        return render(
            request,
            "Lobby/createWEB.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createTGZpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "TGZ", TGZ_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createTGZ.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = TGZ_Game.objects.get(id=gameID)
        except TGZ_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createTGZ.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": currentGame.startingOptions,
                "startingMap": json.loads(currentGame.startingMap),
                "experienced": experienced,
            },
        )
    else:
        messages.success(request, (gettext("Game creation for selected map")))
        return render(
            request,
            "Lobby/createTGZ.html",
            {"experienced": experienced, "mapData": request.POST["mapData"]},
        )


@login_required
def showTGZoptions(request, gameID):
    try:
        currentGame = TGZ_Game.objects.get(id=gameID)
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    return render(
        request,
        "Lobby/showTGZoptions.html",
        {
            "gameName": currentGame.gameName,
            "gameDescription": currentGame.gameDescription,
            "godsVRhtml": SR_getgodsVRoptionsHTML(currentGame.startingOptions),
        },
    )


@login_required
def createHCpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "HC", HC_Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createHC.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = HC_Game.objects.get(id=gameID)
        except HC_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createHC.html",
            {
                "fillData": True,
                "gameName": currentGame.gameName,
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": currentGame.startingOptions,
                "experienced": experienced,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createFCMpage(request, gameID=None):
    experienced = SF_hasRequiredExperience(request, "FCM", FCM_Game)

    if request.method != "POST" and gameID is None:
        return render(request, "Lobby/createFCM.html", {"experienced": experienced})
    elif request.method != "POST" and gameID is not None:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = FCM_Game.objects.get(id=gameID)
        except FCM_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        SCENARIO_NAMES = [
            "[Cool Original]",
            "[New MS]",
            "[First Coffee]",
            "[Korean City]",
            "[Nightlife]",
            "[Sustenance]",
            "[Upmarket Area]",
            "[City Builder]",
            "[Asian Fusion]",
            "[First Mover]",
            "[Overtime]",
            "[Henri Lo]",
        ]
        gameName = currentGame.gameName
        scenarioUsed = False
        scenarioName = ""
        for scen in SCENARIO_NAMES:
            if scen in gameName:
                scenarioUsed = True
                gameName = gameName.replace(scen, "")
                scenarioName = scen

        playerNames = []
        for user in currentGame.allPlayers.all():
            if request.user != user:
                playerNames.append(user.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createFCM.html",
            {
                "fillData": True,
                "gameName": currentGame.getGameName(),
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "scenarioUsed": scenarioUsed,
                "scenarioName": scenarioName,
                "startingOptions": currentGame.startingOptions,
                "startingMap": currentGame.startingMap,
                "experienced": experienced,
            },
        )
    else:
        messages.success(request, (gettext("Game creation for selected map")))
        return render(
            request,
            "Lobby/createFCM.html",
            {"experienced": experienced, "mapData": request.POST["mapData"]},
        )


class registerView(View):
    form_class = NewUserForm
    template_name = "Lobby/register.html"

    def get(self, request, *args, **kwargs):
        form = self.form_class()
        return render(request, self.template_name, {"form": form})

    def post(self, request, *args, **kwargs):
        form = self.form_class(request.POST)
        if form.is_valid():
            # Limit intial signups
            # if User.objects.all().count() > 5:
            #    messages.error(request, "Beta Signup is Already Full")
            #    return render(request, self.template_name, {'form': form})
            # Check if email taken
            if User.objects.filter(email=request.POST["email"]).exists():
                messages.error(request, gettext("Email Address Already Registered"))
                return render(request, self.template_name, {"form": form})
            # Check if any case similar username exists
            if User.objects.filter(username__iexact=request.POST["username"]).exists():
                messages.error(request, gettext("Username already taken"))
                return render(request, self.template_name, {"form": form})
            user = form.save(commit=False)
            user.is_active = False  # Deactivate account till it is confirmed
            user.save()

            current_site = get_current_site(request)
            subject = gettext("Activate Your Online Gaming Account")
            emailText = render_to_string(
                "Lobby/password/account_activation_email.txt",
                {
                    "user": user,
                    "domain": current_site.domain,
                    "uid": urlsafe_base64_encode(force_bytes(user.pk)),
                    "token": account_activation_token.make_token(user),
                },
            )
            # user.email_user(subject, message)
            try:
                send_mail(
                    subject,
                    emailText,
                    "OnlineBoardGamers@gmail.com",
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                adminMessage = f"Failed to send activation email to username: {user.username} and email {user.email}: {str(e)}"
                print(
                    "****************************************************************************** EMAIL SIGNUP ERROR **************"
                )
                SN_sendAdminErrorMessage(request, adminMessage)
                return HttpResponse("Invalid header found.")
            message = gettext(
                "Please check %(emailAddress)s to confirm your email address and complete registration"
            ) % {"emailAddress": user.email}
            messages.success(request, (message))
            return redirect("index")

        return render(request, self.template_name, {"form": form})


class ActivateAccount(View):
    def get(self, request, uidb64, token, *args, **kwargs):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            profile = getattr(user, "profile")
            profile.email_confirmed = True
            profile.save()
            user.save()
            login(request, user)
            messages.success(
                request,
                mark_safe(
                    gettext(
                        "Your account has been activated<br/>Enable Email, Discord, and Slack notifications here on your profile, and then return to the Home Page to view games"
                    )
                ),
            )
            return redirect("profile")
        else:
            messages.warning(
                request,
                (
                    gettext(
                        "The confirmation link was invalid, possibly because it has already been used. If you think your email client scanned the link, then try to log in anyway"
                    )
                ),
            )
            return redirect("index")


def activate(request, uidb64, token):
    User = get_user_model()
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.save()
        return HttpResponse(
            gettext(
                "Thank you for your email confirmation. Now you can login to your account"
            )
        )
    else:
        return HttpResponse(gettext("Activation link is invalid"))


def playerInfo(request, usernameToProfile):
    try:
        userToProfile = User.objects.select_related("profile").get(
            username=usernameToProfile
        )
    except User.DoesNotExist:
        messages.error(request, gettext("Player does not exist"))
        return render(request, "Lobby/playerInfo.html")

    profileOfUser = getattr(userToProfile, "profile")
    FCMtournamentTrophies = json.loads(profileOfUser.FCMtournamentTrophies)

    trophyHTML = ""
    trophyDetailHTML = ""

    # Game names and image URLs
    game_names = {
        1: "FCM",
        2: "HC",
        3: "Bus",
        4: "TGZ",
        5: "AQY",
        6: "IND",
        7: "KFW",
        8: "WEB",
    }
    image_urls = {
        1: "/static/FCM/images/burger_board.png",
        2: "/static/HC/images/icon_car.png",
        3: "/static/Bus/images/bus_icon.png",
        4: "/static/TGZ/images/tgz_icon.png",
        5: "/static/AQY/images/aqy_icon.png",
        6: "/static/IND/images/ind_icon.png",
        7: "/static/KFW/images/kfw_icon.png",
        8: "/static/WEB/images/web_icon.png",
    }

    if len(FCMtournamentTrophies) > 1:
        totals = [sum(col) for col in zip(*FCMtournamentTrophies[1:])]

        medal_names = ["gold", "silver", "bronze"]
        medal_images = [
            "/static/Lobby/images/trophy_gold.png",
            "/static/Lobby/images/trophy_silver.png",
            "/static/Lobby/images/trophy_bronze.png",
        ]

        for total, medal_name, medal_image in zip(totals, medal_names, medal_images):
            if total > 0:
                trophyHTML += f'<div class="trophyHolderDiv"><img class="trophyIMG" src="{medal_image}"><div class="trophyNumberDiv">{total}</div></div>'

        for index, game in enumerate(FCMtournamentTrophies[1:], start=1):
            game_name = game_names.get(index, "")
            image_url = image_urls.get(index, "")

            if any(value != 0 for value in game):
                trophyDetailHTML += f'<img src="{image_url}" alt="{game_name} Trophies" title="{game_name} Trophies" class="trophyGameIcon"/>'

                for trophy_colour, amount in enumerate(game):
                    if amount != 0:
                        colour = ["gold", "silver", "bronze"][trophy_colour]
                        trophyDetailHTML += f'<div class="trophyHolderSummaryDiv"><img class="trophyIMGsummary" src="/static/Lobby/images/trophy_{colour}.png"><div class="trophyNumberSummaryDiv">{amount}</div></div>'

    target_id = getattr(userToProfile, "id")
    req_user_id = request.user.id
    is_self = request.user.username == usernameToProfile

    # Containers
    activeJoint, finishedJoint, activeOther, finishedOther = [], [], [], []
    total_finished_joint = 0
    total_wins_joint = 0
    jointGameStats = []
    allGamesArr = []

    finishedGamesLastYear = 0
    kickedOutGamesLastYear = 0
    minus1year = int(
        (datetime.datetime.now() - datetime.timedelta(days=365)).timestamp() * 1000
    )

    # THE MASTER LOOP: One model at a time
    for game_name, game_model in GAME_NAMES_MODELS.items():
        if usesUnifiedGameModel(game_name):
            # Handle unified Game model (CNS, WEB, etc.)
            all_games = list(
                Game.objects.filter(gameCode=game_name, players__player_id=target_id)
                .prefetch_related('players__player')
                .distinct()
            )
        else:
            # Check if winner is FK or M2M to optimize JOINs
            winner_field = game_model._meta.get_field("winner")
            is_winner_m2m = winner_field.many_to_many

            # Start the query
            query = game_model.objects.filter(allPlayers=target_id)

            # Use select_related for ForeignKeys (0 hits)
            # Use prefetch_related for ManyToMany (1 hit per field)
            if not is_winner_m2m:
                query = query.select_related("winner")
                prefetches = ["allPlayers", "missingPlayers", "kickedPlayers"]
            else:
                prefetches = ["allPlayers", "missingPlayers", "kickedPlayers", "winner"]

            all_games = list(query.prefetch_related(*prefetches).distinct())

        # Model-specific counters for the stats table
        model_joint_finished = 0
        model_joint_wins = 0

        # Stats by player count: {player_count: [total, won]}
        stats_by_size = {i: [0, 0] for i in range(2, 7)}
        model_total_finished = 0
        model_total_won = 0

        for game in all_games:
            status = game.gameStatus

            # Handle unified Game model (CNS, WEB, etc.) differently
            if usesUnifiedGameModel(game_name):
                # Optimization: Use sets for membership checks
                all_p_ids = {gp.player.id for gp in game.players.all()}
                is_joint = req_user_id in all_p_ids

                # --- Win Calculation ---
                winner_ids = [gp.player.id for gp in game.players.all() if gp.winner]

                if status == "FINISHED":
                    # General Stats Logic
                    has_shadow = any(gp.player.username == "SHADOW" for gp in game.players.all())

                    if not has_shadow:
                        model_total_finished += 1
                        if target_id in winner_ids:
                            model_total_won += 1

                        # Group by maxPlayers (2-6)
                        if 2 <= game.maxPlayers <= 6:
                            stats_by_size[game.maxPlayers][0] += 1
                            if target_id in winner_ids:
                                stats_by_size[game.maxPlayers][1] += 1

                    # Joint Stats Logic
                    if not is_self and is_joint:
                        model_joint_finished += 1
                        if req_user_id in winner_ids:
                            model_joint_wins += 1

                    # Fair Play Logic (Last Year)
                    if int(game.latestUpdate) >= minus1year:
                        finishedGamesLastYear += 1
                        if any(gp.player.id == target_id and gp.is_kicked for gp in game.players.all()):
                            kickedOutGamesLastYear += 1

                # --- Categorization for Lists ---
                if not is_self:
                    if is_joint:
                        if status == "ACTIVE":
                            activeJoint.append(game)
                        else:
                            finishedJoint.append(game)
                    else:
                        if status == "ACTIVE":
                            activeOther.append(game)
                        else:
                            finishedOther.append(game)
                else:
                    if status == "ACTIVE":
                        activeOther.append(game)
                    else:
                        finishedOther.append(game)
            else:
                # Legacy game models
                # Optimization: Use sets for membership checks
                all_p_ids = {p.id for p in game.allPlayers.all()}
                is_joint = req_user_id in all_p_ids

                # --- Win Calculation (0 Hits because of prefetch) ---
                winner_ids = []
                if game.winner:
                    if hasattr(game.winner, "all"):
                        winner_ids = [w.id for w in game.winner.all()]
                    else:
                        winner_ids = [game.winner.id]

                if status == "FINISHED":
                    # General Stats Logic
                    # Exclude SHADOW from general win stats as per your original Q
                    has_shadow = any(p.username == "SHADOW" for p in game.allPlayers.all())

                    if not has_shadow:
                        model_total_finished += 1
                        if target_id in winner_ids:
                            model_total_won += 1

                        # Group by maxPlayers (2-6)
                        if 2 <= game.maxPlayers <= 6:
                            stats_by_size[game.maxPlayers][0] += 1
                            if target_id in winner_ids:
                                stats_by_size[game.maxPlayers][1] += 1

                    # Joint Stats Logic
                    if not is_self and is_joint:
                        model_joint_finished += 1
                        if req_user_id in winner_ids:
                            model_joint_wins += 1

                    # Fair Play Logic (Last Year)
                    if int(game.latestUpdate) >= minus1year:
                        finishedGamesLastYear += 1
                        if any(p.id == target_id for p in game.kickedPlayers.all()):
                            kickedOutGamesLastYear += 1

                # --- Categorization for Lists ---
                if not is_self:
                    if is_joint:
                        if status == "ACTIVE":
                            activeJoint.append(game)
                        else:
                            finishedJoint.append(game)
                    else:
                        if status == "ACTIVE":
                            activeOther.append(game)
                        else:
                            finishedOther.append(game)
                else:
                    if status == "ACTIVE":
                        activeOther.append(game)
                    else:
                        finishedOther.append(game)

        # Step 2: Post-Model Processing (Joint)
        if not is_self and model_joint_finished > 0:
            win_pct = str(round((model_joint_wins / model_joint_finished) * 100))
            jointGameStats.append(
                [game_name, model_joint_wins, model_joint_finished, win_pct]
            )
            total_finished_joint += model_joint_finished
            total_wins_joint += model_joint_wins

        # Step 3: Post-Model Processing (General Stats Table)
        gameArr = []
        for i in range(2, 7):
            total, won = stats_by_size[i]
            pct = int((won / total * 100)) if total > 0 else 0
            gameArr.extend([total, won, pct])

        all_pct = (
            int((model_total_won / model_total_finished * 100))
            if model_total_finished > 0
            else 0
        )
        gameArr.extend([model_total_finished, model_total_won, all_pct])
        allGamesArr.append(gameArr)
        post_loop_hits = len(connection.queries)

    # Final calculations
    jointWinTotal = str(total_wins_joint)
    jointWinPercentage = (
        str(round((total_wins_joint / total_finished_joint) * 100))
        if total_finished_joint > 0
        else "0"
    )

    fairPlayLastYear = 100
    if finishedGamesLastYear > 0:
        # Subtract 1 from kickouts as per your logic
        adj_kicked = max(0, kickedOutGamesLastYear - 1)
        fairPlayLastYear = int(
            (finishedGamesLastYear - adj_kicked) / finishedGamesLastYear * 100
        )

    return render(
        request,
        "Lobby/playerInfo.html",
        {
            "trophyHTML": trophyHTML,
            "trophyDetailHTML": trophyDetailHTML,
            "activeJointGames": [
                SF_fastSerializeGame(g, request.user)
                for g in sorted(activeJoint, key=lambda x: x.latestUpdate, reverse=True)
            ],
            "activeOtherGames": [
                SF_fastSerializeGame(g, request.user)
                for g in sorted(activeOther, key=lambda x: x.latestUpdate, reverse=True)
            ],
            "finishedJointGames": [
                SF_fastSerializeGame(g, request.user)
                for g in sorted(
                    finishedJoint, key=lambda x: x.latestUpdate, reverse=True
                )
            ],
            "finishedOtherGames": [
                SF_fastSerializeGame(g, request.user)
                for g in sorted(
                    finishedOther, key=lambda x: x.latestUpdate, reverse=True
                )
            ],
            "usernameToProfile": usernameToProfile,
            "kickedOutGamesLastYear": kickedOutGamesLastYear,
            "fairPlayLastYear": fairPlayLastYear,
            "games": GAME_NAMES_MODELS,
            "allGamesArr": allGamesArr,
            "jointWinTotal": jointWinTotal,
            "jointWinPercentage": jointWinPercentage,
            "jointGameStats": jointGameStats,
        },
    )


@login_required()
def AllTournaments(request):
    tournaments_FCM = FCM_Tournament.objects.order_by("-id").all()
    tournaments_HC = HC_Tournament.objects.order_by("-id").all()
    tournaments_Bus = Bus_Tournament.objects.order_by("-id").all()
    tournaments_AQY = AQY_Tournament.objects.order_by("-id").all()
    tournaments_IND = IND_Tournament.objects.order_by("-id").all()
    tournaments_MAIN = Main_Tournament.objects.order_by("-id").all()

    tournaments = sorted(
        chain(
            tournaments_FCM,
            tournaments_HC,
            tournaments_Bus,
            tournaments_AQY,
            tournaments_IND,
            tournaments_MAIN,
        ),
        key=lambda instance: instance.created,
    )
    tournaments.reverse()

    tournamentsJson = [tourny.serialize() for tourny in tournaments]

    return render(
        request,
        "Lobby/tournaments/AllMainTournaments.html",
        {
            "tournamentsJson": tournamentsJson,
        },
    )


@login_required()
def Tournament(request, gameType, tournamentID):
    if request.method == "POST":
        currentTournament = None
        try:
            if gameType == "FCM":
                currentTournament = FCM_Tournament.objects.get(id=tournamentID)
            if gameType == "HC":
                currentTournament = HC_Tournament.objects.get(id=tournamentID)
            if gameType == "Bus":
                currentTournament = Bus_Tournament.objects.get(id=tournamentID)
            if gameType == "AQY":
                currentTournament = AQY_Tournament.objects.get(id=tournamentID)
            if gameType == "IND":
                currentTournament = IND_Tournament.objects.get(id=tournamentID)
        except Exception:
            raise Http404(gettext("Tournament does not exist"))
        if (
            currentTournament
            and currentTournament.startingPlayers.count()
            < currentTournament.maxTournamentPlayers
        ):
            currentTournament.startingPlayers.add(request.user)
            currentTournament.save()
            if (
                currentTournament.startingPlayers.count()
                == currentTournament.maxTournamentPlayers
            ):
                pass
            messages.success(request, (gettext("You have joined the Tournament")))
        else:
            messages.error(request, gettext("The Tournament is already full"))
        return HttpResponseRedirect(
            reverse(
                "Tournament",
                kwargs={"gameType": gameType, "tournamentID": tournamentID},
            )
        )

    currentTournament = None
    try:
        if gameType == "FCM":
            currentTournament = FCM_Tournament.objects.get(id=tournamentID)
        if gameType == "HC":
            currentTournament = HC_Tournament.objects.get(id=tournamentID)
        if gameType == "Bus":
            currentTournament = Bus_Tournament.objects.get(id=tournamentID)
        if gameType == "AQY":
            currentTournament = AQY_Tournament.objects.get(id=tournamentID)
        if gameType == "IND":
            currentTournament = IND_Tournament.objects.get(id=tournamentID)
    except Exception:
        raise Http404(gettext("Tournament does not exist"))

    if currentTournament and currentTournament.tournamentStatus == "OP":
        openSlots = []
        for i in range(
            currentTournament.startingPlayers.count() + 1,
            currentTournament.maxTournamentPlayers + 1,
        ):
            openSlots.append(str(i))
        return render(
            request,
            "Lobby/Tournament.html",
            {
                "tournament": currentTournament,
                "gameType": gameType,
                "openSlots": openSlots,
                "isSignedUp": currentTournament.isSignedUp(request.user),
            },
        )

    if (
        currentTournament
        and currentTournament.tournamentStatus == "IP"
        or currentTournament
        and currentTournament.tournamentStatus == "FN"
    ):
        winnerHTML = ""
        if currentTournament.tournamentStatus == "FN":
            winnersData = json.loads(currentTournament.winnersData)
            winnersData = winnersData[0]
            winnerHTML = "Winner"
            if len(winnersData) > 1:
                winnerHTML += "s"
            winnerHTML += ": "
            for index, name in enumerate(winnersData):
                winnerHTML += "<B>" + name + "</B>"
                if index + 1 != len(winnersData):
                    winnerHTML += ", "
        tournamentProgressionDataArray = json.loads(
            currentTournament.tournamentProgressionData
        )
        return render(
            request,
            "Lobby/Tournament.html",
            {
                "tournament": currentTournament,
                "roundsHTML": currentTournament.getRoundsHTML(),
                "TPDA": tournamentProgressionDataArray,
                "winnerHTML": winnerHTML,
                "gameType": gameType,
            },
        )

    return render(request, "Lobby/Tournament.html")


def joinGameLink(request, joinGameLink):
    gameCode = None
    numbers = None

    match = re.match(r"([A-Za-z]{2,3})(\d+)$", joinGameLink)

    # CHCEK FOR gameCode/NUMBERS
    if match:
        gameCode = match.group(1)
        if gameCode != "Bus":
            letters = gameCode.upper()
        numbers = int(match.group(2))
    else:
        messages.error(request, (gettext("Invalid Game Join Link")))
        return index(request)

    # So with a valid letter / number combo, show a join link page
    # First, find a serialise the game.
    # Select the correct model
    gameModel = GAME_NAMES_MODELS.get(gameCode)
    if gameModel is None:
        messages.error(request, (gettext("Sorry, the game no longer exists")))
        return HttpResponseRedirect(reverse("index"))

    try:
        if usesUnifiedGameModel(gameCode):
            availableGame = Game.objects.get(id=numbers, gameCode=gameCode)
        else:
            availableGame = gameModel.objects.get(id=numbers)
    except Exception:
        messages.error(request, (gettext("Sorry, the game no longer exists")))
        return HttpResponseRedirect(reverse("index"))

    if usesUnifiedGameModel(gameCode):
        current_player_count = availableGame.players.exclude(is_kicked=True).count()
    else:
        current_player_count = availableGame.allPlayers.count()

    if current_player_count >= availableGame.maxPlayers:
        messages.error(request, (gettext("Sorry, the game is full")))
        return HttpResponseRedirect(reverse("index"))

    availableGamesList = [availableGame]

    # Serialize the game objects using Django's serializer
    availableGamesListJson = [SF_fastSerializeGame(availableGame, request.user)]

    return render(
        request,
        "Lobby/joinGameLink.html",
        {
            "availableGamesList": availableGamesListJson,
            "gameCode": gameCode,
            "gameID": numbers,
        },
    )


@login_required
def joinGame(request, gameType):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid Request"}, status=400)

    # This is redundant with @login_required, but it's here just to be explicit
    if not request.user.is_authenticated:
        messages.error(request, (gettext("You must be logged in to join a game")))
        return HttpResponseRedirect(reverse("index"))

    jsonData = json.loads(request.body)
    gameModel = GAME_NAMES_MODELS.get(gameType)

    # This just removes linting errors
    if not gameModel:
        return JsonResponse({"error": "Invalid Model"}, status=400)

    # Handle unified Game model (CNS, WEB, etc.)
    if usesUnifiedGameModel(gameType):
        try:
            currentGame = Game.objects.prefetch_related("players__player", "invitedPlayers").get(
                id=jsonData["gameID"],
                gameCode=gameType
            )
        except Game.DoesNotExist:
            messages.error(request, (gettext("Sorry, the game no longer exists")))
            return JsonResponse({"listToShow": "AVAILABLE"}, safe=False)

        action = jsonData.get("action", "")
        current_players_list = [gp.player for gp in currentGame.players.exclude(is_kicked=True) if gp.player]
    else:
        # Legacy game models
        try:
            currentGame = gameModel.objects.prefetch_related("allPlayers").get(
                id=jsonData["gameID"]
            )
        except gameModel.DoesNotExist:
            messages.error(request, (gettext("Sorry, the game no longer exists")))
            return JsonResponse({"listToShow": "AVAILABLE"}, safe=False)

        action = jsonData.get("action", "")
        current_players_list = list(currentGame.allPlayers.all())

    # Delete Training Game // Can never really fail
    if currentGame and action == "deleteTrgGame":
        if request.user in current_players_list:
            currentGame.delete()
            messages.success(request, ("Game Deleted"))
            return JsonResponse(["Ok"], safe=False)
        else:
            messages.error(request, (gettext("Illegal Access")))
            return JsonResponse(["Error"], safe=False)

    # Leave your own waiting game -- they are already AVAILABLE
    elif action == "vacate":
        if currentGame.gameStatus == "ACTIVE":
            messages.error(request, (gettext("The game has already started")))
        else:
            if usesUnifiedGameModel(gameType):
                # For unified model games, delete the GamePlayer
                currentGame.players.filter(player=request.user).delete()
            else:
                # Legacy models
                currentGame.allPlayers.remove(request.user)

            # Using len() on the prefetched list minus the one we removed
            if len(current_players_list) <= 1:
                currentGame.delete()
                messages.success(
                    request, (gettext("You have left the game - it has been deleted"))
                )
            else:
                currentGame.save()
                messages.success(
                    request,
                    (
                        gettext(
                            "You have left the game - it is available for players to join"
                        )
                    ),
                )

        print(f"DB hits: {len(connection.queries)}")

        return JsonResponse(["AVAILABLE"], safe=False)

    elif currentGame and action == "decline":
        currentGame.invitedPlayers.remove(request.user)
        if currentGame.invitedPlayers.count() == 0:
            if currentGame.gameStatus == "WAITING":
                messages.success(
                    request,
                    (
                        gettext(
                            "You have declined the invitation - it is available for players to join"
                        )
                    ),
                )
                currentGame.gameStatus = "AVAILABLE"
            elif currentGame.gameStatus == "PRIVATE":
                messages.success(request, (gettext("You have declined the invitation")))
        else:
            messages.success(
                request,
                (
                    gettext(
                        "You have declined the invitation - the game is waiting for other invitees to respond"
                    )
                ),
            )

        # Send an email to the creator, telling them who has declined and why
        reason = jsonData.get("reason", "None Given")
        SN_sendDeclineEmail(request, request.user, gameType, currentGame, reason)
        currentGame.save()
        return JsonResponse(["AVAILABLE"], safe=False)
    # Else must be join?
    else:
        response = checkJoinGame(request, gameType, jsonData["gameID"])
        print(f"DB hits: {len(connection.queries)}")
        return response


# This should be a check all function. Anything and anyone could be entering here
@login_required
def checkJoinGame(request, gameType, gameID):
    errorFound = False
    ajaxReturn = False
    body = request.body.decode("utf-8")
    jsonData = json.loads(body) if body else {}
    if jsonData.get("source") == "ajax":
        ajaxReturn = True

    gameModel = None

    # CHECK VALID gameType
    if gameType in GAME_NAMES_MODELS:
        gameModel = GAME_NAMES_MODELS[gameType]
    else:
        messages.error(request, (gettext("Invalid Game Join Link")))
        if ajaxReturn:
            return JsonResponse(
                {
                    "listToShow": "AVAILABLE",
                }
            )
        return
    # CHECK GAME EXISTS
    if usesUnifiedGameModel(gameType):
        try:
            currentGame = Game.objects.prefetch_related(
                "invitedPlayers", "players__player", "creator__profile__blacklistedPlayers"
            ).get(id=gameID, gameCode=gameType)
        except Game.DoesNotExist:
            messages.error(request, (gettext("Sorry, the game does not exist")))
            if ajaxReturn:
                return JsonResponse(
                    {
                        "listToShow": "AVAILABLE",
                    }
                )
            return

        # Get player lists for unified model games
        all_players_list = [gp.player for gp in currentGame.players.exclude(is_kicked=True) if gp.player]
        invited_players_list = list(currentGame.invitedPlayers.all())
    else:
        try:
            currentGame = gameModel.objects.prefetch_related(
                "invitedPlayers", "allPlayers", "creator__profile__blacklistedPlayers"
            ).get(id=gameID)
        except gameModel.DoesNotExist:
            messages.error(request, (gettext("Sorry, the game does not exist")))
            if ajaxReturn:
                return JsonResponse(
                    {
                        "listToShow": "AVAILABLE",
                    }
                )
            return

        # Use in-memory checks for prefetched sets (no .all() or .filter())
        all_players_list = list(currentGame.allPlayers.all())
        invited_players_list = list(currentGame.invitedPlayers.all())

    # Check that if the game is WAITING, you are in the invites, OR there is a blank space
    if (
        currentGame.gameStatus == "WAITING"
        and request.user not in invited_players_list
        and (len(invited_players_list) + len(all_players_list))
        >= currentGame.maxPlayers
    ):
        messages.error(
            request,
            (
                gettext(
                    "The host set the usernames of players allowed to join. Unfortunately, you are not allowed to join this game"
                )
            ),
        )
        errorFound = True

    # Check you are not already involved
    if request.user in all_players_list:
        messages.success(request, (gettext("You have already joined this game")))
        errorFound = True

    # Check the host hasn't blacklisted you
    if (
        request.user in currentGame.creator.profile.blacklistedPlayers.all()
    ):  # =request.user:
        messages.error(
            request, (gettext("The creator has blocked you from joining their games"))
        )
        errorFound = True

    if errorFound and ajaxReturn:
        return JsonResponse(
            {
                "listToShow": "AVAILABLE",
            }
        )
    if errorFound:
        return

    # SO NOW IT IS NOT ACTIVE OR FINISHED, AND IF IT IS "WAITING", YOU ARE AN INVITEE, PLUS YOU ARE NOT ALREADY IN THE GAME
    _latestUpdate = int(time.time()) * 1000

    # CHECK EXPERIENCE LEVEL HERE
    is_experienced = currentGame.presenter().isExperiencedGame() if usesUnifiedGameModel(gameType) else currentGame.isExperiencedGame()

    if is_experienced:
        # Optimization: Fetch SHADOW once
        shadow_user = User.objects.get(username="SHADOW")

        if usesUnifiedGameModel(gameType):
            # 1 Hit: Count finished games for unified model games
            exp = (
                Game.objects.filter(gameCode=gameType, gameStatus="FINISHED", players__player=request.user)
                .exclude(players__player=shadow_user)
                .distinct()
                .count()
            )
        else:
            # 1 Hit: Count finished games for current model
            exp = (
                gameModel.objects.filter(allPlayers=request.user, gameStatus="FINISHED")
                .exclude(allPlayers=shadow_user)
                .count()
            )

        if exp < SF_getRequiredExp(gameType):
            ##### SEND DISCORD ALERT
            try:
                message = "==== NEW USER JOINING EXP GAME\n"
                message += "Game: " + gameType + "\n"
                message += "User: " + request.user.username + "\n"

                requests.post(
                    f"https://discordapp.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                    data={"content": message},
                )
            except Exception:
                pass
            messages.error(
                request,
                (
                    mark_safe(
                        gettext(
                            'Not enough Experience. Plese see <a class="linkOther" href="/help/#navGameType">Help</a><br/>Current Experience Requirements:<br/><br/>FCM: 2 Games<br/>HC: 1 Game<br/>Bus: 1 Game<br/>TGZ: 2 Games<br/>Cannes:2 Games<br/>Antiquity:2 Games<br/><br/>You may start your own game <a class="linkOther" href="/newGames/">Here</a>'
                        )
                    )
                ),
            )
            request.session["listType"] = "available"

            if ajaxReturn:
                return JsonResponse({"listToShow": "AVAILABLE", "show_div": True})
            return

        # Now check the fair play rating
        minus1year = int(
            (datetime.datetime.now() - datetime.timedelta(days=365)).timestamp() * 1000
        )

        finishedGamesLastYear = 0
        kickedOutGamesLastYear = 0
        fairPlayLastYear = 100

        for game_name, game_model in GAME_NAMES_MODELS.items():
            if usesUnifiedGameModel(game_name):
                # Handle unified Game model games
                finishedGames = Game.objects.filter(
                    Q(gameCode=game_name),
                    Q(gameStatus="FINISHED"),
                    ~Q(players__player__username="SHADOW"),
                    Q(players__player=request.user),
                ).distinct()

                finishedGames_last_year = finishedGames.filter(
                    Q(latestUpdate__gte=minus1year)
                )
                kickedOutGames = finishedGames_last_year.filter(
                    Q(players__is_kicked=True, players__player=request.user)
                ).distinct()

                finishedGamesLastYear += finishedGames_last_year.count()
                kickedOutGamesLastYear += kickedOutGames.count()
            else:
                # Legacy game models
                finishedGames = game_model.objects.filter(
                    Q(gameStatus="FINISHED"),
                    ~Q(allPlayers__username="SHADOW"),
                    Q(allPlayers=request.user),
                )

                finishedGames_last_year = finishedGames.filter(
                    Q(latestUpdate__gte=minus1year)
                )
                kickedOutGames = finishedGames_last_year.filter(
                    Q(kickedPlayers=request.user)
                )

                finishedGamesLastYear += finishedGames_last_year.count()
                kickedOutGamesLastYear += kickedOutGames.count()

        if kickedOutGamesLastYear > 0:
            kickedOutGamesLastYear -= 1
        if finishedGamesLastYear > 0:
            fairPlayLastYear = int(
                (finishedGamesLastYear - kickedOutGamesLastYear)
                / finishedGamesLastYear
                * 100
            )

        if fairPlayLastYear <= 80:
            ##### SEND DISCORD ALERT
            try:
                message = "==== BAD FP RATING JOINING EXP GAME\n"
                message += "Game: " + gameType + "\n"
                message += "User: " + request.user.username + "\n"

                requests.post(
                    f"https://discordapp.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                    data={"content": message},
                )
            except Exception:
                pass
            messages.error(
                request,
                (
                    mark_safe(
                        gettext(
                            'Your Fair Play rating is too low: {fairplay}%. Please see <a class="linkOther" href="/help/#navGameType">Help</a><br/><br/>'
                        ).format(fairplay=fairPlayLastYear)
                    )
                ),
            )
            request.session["listType"] = "available"

            if ajaxReturn:
                return JsonResponse({"listToShow": "AVAILABLE", "show_div": True})
            return

    _newPlayer = request.user

    if usesUnifiedGameModel(gameType):
        # For unified model games, create a GamePlayer
        GamePlayer.objects.create(
            game=currentGame,
            player=_newPlayer
        )
    else:
        # Legacy models
        currentGame.allPlayers.add(_newPlayer)

    currentGame.latestUpdate = _latestUpdate
    currentGame.invitedPlayers.remove(request.user)

    current_player_count = len(all_players_list) + 1

    if current_player_count == currentGame.maxPlayers:
        if usesUnifiedGameModel(gameType):
            currentGame.presenter().startGame(request)
        else:
            currentGame.startGame(request)
        messages.success(
            request, (gettext("You have joined the game and the game has started"))
        )
        request.session["listType"] = "ACTIVE"
        response = JsonResponse({"listToShow": "ACTIVE"}, safe=False)
    else:
        messages.success(
            request, (gettext("You have joined the game - waiting for more players"))
        )
        response = JsonResponse({"listToShow": "WAITING"}, safe=False)

    # If all < MAX and no more invites
    if (
        current_player_count != currentGame.maxPlayers
        and len(invited_players_list) - 1 == 0
        and currentGame.gameStatus != "PRIVATE"
    ):
        currentGame.gameStatus = "AVAILABLE"

    currentGame.save()

    return response


@login_required()
def deleteGame(request, gameType):
    # Joining a game must be via POST
    if request.method != "DELETE":
        return JsonResponse({"error": "Invalid Request"}, status=400)

    jsonData = json.loads(request.body)

    gameModel = GAME_NAMES_MODELS.get(gameType)
    try:
        if gameModel is None:
            return JsonResponse({"noGame": True}, safe=False)

        if usesUnifiedGameModel(gameType):
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode=gameType)
        else:
            currentGame = gameModel.objects.get(id=jsonData["gameID"])
    except:
        return JsonResponse({"noGame": True}, safe=False)

    # Delete Training Game // Can never really fail
    if jsonData["action"] == "deleteTrgGame":
        if usesUnifiedGameModel(gameType):
            user_is_player = currentGame.players.filter(player=request.user).exists()
        else:
            user_is_player = request.user in currentGame.allPlayers.all()

        if user_is_player:
            gameStatus = currentGame.gameStatus
            currentGame.delete()
            return JsonResponse(
                {
                    "gameType": gameType,
                    "gameID": jsonData["gameID"],
                    "gameStatus": gameStatus,
                },
                safe=False,
            )
        else:
            try:
                message = ""
                message += "=== DELETE GAME HACK DELETE GAME HACK DELETE GAME HACK DELETE GAME HACK DELETE GAME HACK DELETE GAME HACK ===================================\n"
                message += "DELETE GAME HACK DELETE GAME HACK\n"
                if request.user.is_authenticated:
                    message += "User: " + request.user.username + "\n"
                message += "Path: " + request.path + "\n"
                message += "Method: " + request.method + "\n"
                message += (
                    "User Is Authenticated: "
                    + str(request.user.is_authenticated)
                    + "\n"
                )
                if request.user.is_authenticated:
                    message += "Email: " + request.user.email + "\n"

                requests.post(
                    f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                    data={"content": message},
                )
            except Exception:
                pass

    return HttpResponse(status=204)  # No Content


@login_required
def autoCompleteUsername(request):
    if request.method == "POST":
        jsonData = json.loads(request.body)
        partialString = jsonData["partialString"]

        matchObjects = User.objects.filter(username__icontains=partialString).all()

        matchList = []
        for user in matchObjects:
            matchList.append(user.username)
        return JsonResponse({"matchList": matchList}, safe=False)

    else:
        return render(request, "Lobby/index.html")


def blacklistPlayer(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)
    if jsonData["action"] == "addPlayerToBlacklist":
        usernameToAdd = jsonData["blackListPlayer"]
        if usernameToAdd == request.user.username:
            return JsonResponse(
                {"errorMessage": "You can't blacklist yourself."}, status=400
            )
        if User.objects.filter(username=usernameToAdd).exists():
            userProfile = Profile.objects.get(
                user=User.objects.get(username=request.user.username)
            )
            userToAdd = User.objects.get(username=usernameToAdd)
            # Check if the user is already blacklisted
            if userToAdd in userProfile.blacklistedPlayers.all():
                return JsonResponse(
                    {"errorMessage": "User is already blacklisted."}, status=400
                )

            userProfile.blacklistedPlayers.add(userToAdd)
            userProfile.save()
            return JsonResponse({"success": True}, safe=False)
        else:
            return JsonResponse({"errorMessage": "User does not exist."}, status=400)

    elif jsonData["action"] == "removePlayerFromBlacklist":
        usernameToRemove = jsonData["blackListPlayer"]
        userProfile = Profile.objects.get(
            user=User.objects.get(username=request.user.username)
        )
        userToRemove = User.objects.get(username=usernameToRemove)
        userProfile.blacklistedPlayers.remove(userToRemove)
        userProfile.save()
        return JsonResponse({"success": True}, safe=False)

    return HttpResponse(status=204)  # No Content


@login_required
def testWebhook(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)
    notification = jsonData["notification"]

    if notification[0] == "Discord":
        # Validate Discord URL
        if (
            notification[1]
            and notification[1][0:15] != "https://discord"
            and notification[1][0:19] != "https://ptb.discord"
            and notification[1][0:18] != "https://discordapp"
        ):
            error_string = gettext("Please enter a Valid Discord Webhook URL")
            return JsonResponse({"errorMessage": error_string, "type": 0})
        # Validate Discord ID:
        if len(notification[2]) != 0 and len(notification[2]) < 18:
            error_string = gettext("Discord User ID must be an 18+ digit number")
            return JsonResponse({"errorMessage": error_string, "type": 0})

        if len(notification[2]) != 0 and not notification[2].isdigit():
            error_string = gettext("Discord User ID must be an 18+ digit number")
            return JsonResponse({"errorMessage": error_string, "type": 0})

        message = ""
        if len(notification[2]) != 0:
            message += "<@" + notification[2] + ">\n"
        message += gettext("This is a test message from Online Board Gamers")
        requests.post("" + notification[1], data={"content": message})
        return JsonResponse({"response": "ok", "type": 0})

    if notification[0] == "Slack":
        # Validate Slack URL
        if (
            notification[1]
            and notification[1][0:33] != "https://hooks.slack.com/services/"
        ):
            error_string = gettext("Please enter a Valid Slack Webhook URL")
            return JsonResponse({"errorMessage": error_string, "type": 1})

        # Validate Slack Member ID (optional, like Discord)
        slack_member_id = notification[2] if len(notification) > 2 else ""
        if slack_member_id and len(slack_member_id) < 8:
            error_string = gettext(
                "Slack Member ID must be a valid alphanumeric ID (e.g., U123ABC456)"
            )
            return JsonResponse({"errorMessage": error_string, "type": 1})
        if slack_member_id and not slack_member_id.replace("U", "").isalnum():
            error_string = gettext(
                "Slack Member ID must be alphanumeric (starts with U)"
            )
            return JsonResponse({"errorMessage": error_string, "type": 1})

        # Build message with optional mention
        message = gettext("This is a test message from Online Board Gamers")
        if slack_member_id:
            message = f"<@{slack_member_id}>\n{message}"

        # Payload with link_names=1 to enable mentions
        payload = {"text": message, "link_names": 1}  # Enables @mentions

        # Send via POST (your existing method works fine)
        requests.post(notification[1], json=payload)

        return JsonResponse({"response": "ok", "type": 1})

    if notification[0] == "Telegram":
        TOKEN = config("TELEGRAM_OBG_BOT_TOKEN", default=False, cast=str)
        message = "This is a test message from Online Board Gamers"
        url = f"https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={notification[2]}&text={message}"
        requests.post(url)
        return JsonResponse({"response": "ok", "type": 1})

    if notification[0] == "Other":
        message = "This is a test message from Online Board Gamers"
        requests.post(notification[1], data={"content": message})
        return JsonResponse({"response": "ok", "type": 1})

    return JsonResponse({"errorMessage": gettext("Server Error")})


def TGZtournaments(request):
    userToProfile = get_object_or_404(User, username="TGZtourneyAdmin")

    tournamentKey = "TGZ Summer 25 "

    activeGamesList = sorted(
        TGZ_Game.objects.filter(
            Q(creator=userToProfile),
            Q(gameStatus="ACTIVE"),
            gameName__istartswith=tournamentKey,
            externalTournamentGame=True,
        ),
        key=lambda instance: instance.latestUpdate,
        reverse=True,
    )
    activeGamesListJson = [game.serialize(request.user) for game in activeGamesList]

    finishedGamesList = sorted(
        TGZ_Game.objects.filter(
            Q(creator=userToProfile),
            Q(gameStatus="FINISHED"),
            gameName__istartswith=tournamentKey,
            externalTournamentGame=True,
        ),
        key=lambda instance: instance.latestUpdate,
        reverse=True,
    )
    finishedGamesListJson = [game.serialize(request.user) for game in finishedGamesList]

    return render(
        request,
        "Lobby/TGZtournaments.html",
        {
            "activeGames": activeGamesListJson,
            "finishedGames": finishedGamesListJson,
        },
    )


@login_required
def schism(request):
    def serializeLocal(game):
        winner = game.winner.username if game.winner else None
        latestUpdateString = str(game.latestUpdate)
        return {
            "gameID": game.id,
            "gameName": game.getGameName(),
            "allPlayers": [user.username for user in game.allPlayers.all()],
            "currentTurn": game.currentTurnString(),
            "latestUpdate": latestUpdateString,
            "startingOptions": "",
            "maxPlayers": game.maxPlayers,
            "winner": winner,
            "created": game.created,
            "game": "TGZ",
        }

    # Fetch querysets
    availableGamesList = TGZ_Game.objects.filter(gameStatus="AVAILABLE").order_by(
        "-latestUpdate"
    )
    activeGamesList = TGZ_Game.objects.filter(gameStatus="ACTIVE").order_by(
        "-latestUpdate"
    )
    finishedGamesList = TGZ_Game.objects.filter(gameStatus="FINISHED").order_by(
        "-latestUpdate"
    )

    # Filter finished games for startingOptions containing [7, 8, 9]
    filtered_finished_games = []
    for game in finishedGamesList:
        if game.startingOptions:
            starting_options = json.loads(game.startingOptions)
            if any(option in starting_options for option in [7, 8, 9]):
                filtered_finished_games.append(game)

    # Pagination
    items_per_page = 20
    page = request.POST.get("page", 1)  # Changed to POST to match form
    paginator = Paginator(filtered_finished_games, items_per_page)
    try:
        finished_games_page = paginator.page(page)
    except PageNotAnInteger:
        finished_games_page = paginator.page(1)
        page = 1
    except EmptyPage:
        finished_games_page = (
            paginator.page(paginator.num_pages)
            if paginator.num_pages > 0
            else paginator.page(1)
        )
        page = paginator.num_pages if paginator.num_pages > 0 else 1

    # Process available and active games
    availableGamesJson = []
    activeGamesJson = []
    for game_list, game_json in [
        (availableGamesList, availableGamesJson),
        (activeGamesList, activeGamesJson),
    ]:
        for game in game_list:
            if game.startingOptions:
                try:
                    starting_options = json.loads(game.startingOptions)
                    logger.debug(
                        f"Game {getattr(game, 'id', 'unknown')} (non-finished) startingOptions: {starting_options}"
                    )
                    if not isinstance(starting_options, list):
                        logger.warning(
                            f"Game {getattr(game, 'id', 'unknown')} startingOptions is not a list: {starting_options}"
                        )
                        continue
                    starting_options = [
                        int(opt) if isinstance(opt, str) else opt
                        for opt in starting_options
                    ]
                    if any(option in starting_options for option in [7, 8, 9]):
                        game_json.append(
                            game.serialize(request.user)
                        )  # Use serializeLocal for consistency
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(
                        f"Error processing startingOptions for game {getattr(game, 'id', 'unknown')}: {e}"
                    )
                    continue
            else:
                logger.warning(
                    f"Game {getattr(game, 'id', 'unknown')} has no startingOptions"
                )

    # Serialize paginated finished games
    finishedGamesJson = []
    for game in finished_games_page.object_list:
        finishedGamesJson.append(serializeLocal(game))

    return render(
        request,
        "Lobby/schism.html",
        {
            "availableGames": availableGamesJson,
            "activeGames": activeGamesJson,
            "finishedGames": finishedGamesJson,
            "finished_paginator": paginator,
            "finished_current_page": int(page),
        },
    )


def TGZtournamentFixedSpring24(request):
    return render(request, "Lobby/TGZT/TGZtournamentFixedSpring24.html")


def TGZtournamentFixedAutumn24(request):
    return render(request, "Lobby/TGZT/TGZtournamentFixedAutumn24.html")


def TGZtournamentFixedSummer25(request):
    return render(request, "Lobby/TGZT/TGZtournamentFixedSummer25.html")


def TGZtournamentMain(request, tournamentName):
    ##### USE THIS FOR GROUPINGS
    # Find the tournament key
    #############

    # word_part = tournamentName[:-2].upper()
    # digit_part = tournamentName[-2:]
    # tournamentKey = word_part + " " + digit_part

    tournamentKey = "TGZ Summer 25"  # Then immewdiately " A1" or " B2" NOTE THE KEY DOESN'T INCLUDE THE SPACE FOR SOME REASON

    # This line is common to all
    # allTournamentGames = TGZ_Game.objects.filter(gameName__istartswith=tournamentKey, externalTournamentGame=True, created__gte="1751279600000")

    allTournamentGames = TGZ_Game.objects.annotate(
        created_int=Cast("created", IntegerField())
    ).filter(
        gameName__istartswith=tournamentKey,
        externalTournamentGame=True,
        created_int__gte=1751279600000,
    )

    ## Split the gameName into groups based on letters A to G
    grouped_games = (
        allTournamentGames.annotate(
            group=RawSQL("SUBSTRING(gameName, %s, %s)", (len(tournamentKey) + 2, 1))
        )
        .values("group")
        .annotate(count_games=Count("id"))
    )

    tournamentData = []

    # Iterate through the groups
    for group in grouped_games:
        group_letter = group["group"]
        group_data = {"group": group_letter, "players": [], "games": []}

        games_in_group = allTournamentGames.filter(
            gameName__istartswith=tournamentKey + " " + group_letter
        )

        # Get unique players in the group
        unique_players = User.objects.filter(
            id__in=games_in_group.values_list("allPlayers", flat=True)
        ).distinct()

        # Iterate through each player in the group
        for player in unique_players:
            player_games_finished = games_in_group.filter(
                allPlayers=player, gameStatus="FINISHED"
            )

            # Count the number of games the player participated in
            num_games_finished = player_games_finished.count()

            # Count the number of games the player won
            num_games_won = player_games_finished.filter(winner=player).count()

            # Calculate tie breakers
            tie_breakers = []
            for game in player_games_finished:
                if game.winner != player:
                    if game.kickoutFlexiData != "":
                        kickout_data = json.loads(game.kickoutFlexiData)
                        winner_vp_vr = kickout_data[0][1] - kickout_data[0][2]

                        player_index = next(
                            (
                                index
                                for index, data in enumerate(kickout_data)
                                if data[0] == player.username
                            ),
                            None,
                        )
                        if player_index is not None:
                            player_vp_vr = (
                                kickout_data[player_index][1]
                                - kickout_data[player_index][2]
                            )
                            tie_breakers.append(
                                [-winner_vp_vr + player_vp_vr, getattr(game, "id")]
                            )

            # Sort tie breakers in descending order
            tie_breakers.sort(reverse=True)

            # Append player data to the group's player list
            player_data = {
                "username": player.username,
                "num_games_finished": num_games_finished,
                "num_games_won": num_games_won,
                "tie_breakers": tie_breakers,
            }
            group_data["players"].append(player_data)

        # Sort players by tie breakers
        # group_data['players'].sort(key=lambda x: ([tb[0] for tb in x['tie_breakers']] + [float('-inf')])[:4])
        # Sort players in the group by most wins first
        # group_data['players'].sort(key=lambda x: (x['num_games_won'],), reverse=True)

        # Sort players by tie breakers within each number of wins
        # group_data['players'] = sorted(group_data['players'], key=lambda x: ([tb[0] for tb in x['tie_breakers']] + [float('-inf')])[:4])

        # Sort players in the group by most wins first, and then by tie breakers
        group_data["players"] = sorted(
            group_data["players"],
            key=lambda x: (x["num_games_won"], [tb[0] for tb in x["tie_breakers"]]),
        )

        # Reverse the sorting order for tie breakers
        group_data["players"].reverse()

        # Append game data to the group's games list
        for game in games_in_group:
            game_data = {
                "gameName": game.gameName,
                "players": game.allPlayers,
                "winner": game.winner,  # .username if game.winner else None,
                "gameID": getattr(game, "id"),
            }
            group_data["games"].append(game_data)

        # Append group data to the tournament data list
        tournamentData.append(group_data)

    #################################################
    #
    # ONE MASSIVE GROUP
    #
    # Uncomment everything below. Comment out everything above.
    # Then it should give you one jumbo group
    #
    #################################################

    #    tournamentData = []
    #    tournamentKey = "TGZ Summer 25 "
    #    group_data = {'group': "A", 'players': [], 'games': []}
    #    allTournamentGames = TGZ_Game.objects.filter(gameName__istartswith=tournamentKey, externalTournamentGame=True)
    #
    #    # Get unique players in the group
    #    unique_players = User.objects.filter(id__in=allTournamentGames.values_list('allPlayers', flat=True)).distinct()
    #
    #    # Iterate through each player in the group
    #    for player in unique_players:
    #        player_games_finished = allTournamentGames.filter(allPlayers=player, gameStatus="FINISHED")
    #
    #        # Count the number of games the player participated in
    #        num_games_finished = player_games_finished.count()
    #
    #        # Count the number of games the player won
    #        num_games_won = player_games_finished.filter(winner=player).count()
    #
    #        # Calculate tie breakers
    #        tie_breakers = []
    #        for game in player_games_finished:
    #            if game.winner != player:
    #                if game.kickoutFlexiData != '':
    #                    kickout_data = json.loads(game.kickoutFlexiData)
    #                    winner_vp_vr = kickout_data[0][1] - kickout_data[0][2]
    #
    #                    player_index = next((index for index, data in enumerate(kickout_data) if data[0] == player.username), None)
    #                    if player_index is not None:
    #                        player_vp_vr = kickout_data[player_index][1] - kickout_data[player_index][2]
    #                        tie_breakers.append([-winner_vp_vr + player_vp_vr, game.id])
    #
    #        # Sort tie breakers in descending order
    #        tie_breakers.sort(reverse=True)
    #
    #        # Append player data to the group's player list
    #        player_data = {
    #            'username': player.username,
    #            'num_games_finished': num_games_finished,
    #            'num_games_won': num_games_won,
    #            'tie_breakers': tie_breakers
    #        }
    #        group_data['players'].append(player_data)
    #
    #    # Sort players by tie breakers
    #    group_data['players'].sort(key=lambda x: ([tb[0] for tb in x['tie_breakers']] + [float('-inf')])[:4])
    #    # Sort players in the group by most wins first
    #    group_data['players'].sort(key=lambda x: (x['num_games_won'],), reverse=True)
    #
    #    # Sort players by tie breakers within each number of wins
    #    group_data['players'] = sorted(group_data['players'], key=lambda x: ([tb[0] for tb in x['tie_breakers']] + [float('-inf')])[:4])
    #
    #    # Sort players in the group by most wins first, and then by tie breakers
    #    group_data['players'] = sorted(group_data['players'], key=lambda x: (x['num_games_won'], [tb[0] for tb in x['tie_breakers']]))
    #
    #    # Reverse the sorting order for tie breakers
    #    group_data['players'].reverse()
    #
    #    # Append game data to the group's games list
    #    for game in allTournamentGames:
    #            game_data = {
    #                'gameName': game.gameName,
    #                'players': game.allPlayers,
    #                'winner': game.winner,#.username if game.winner else None,
    #                'gameID': game.id
    #            }
    #            group_data['games'].append(game_data)
    #
    #    # Append group data to the tournament data list
    #    tournamentData.append(group_data)

    #################################################
    #
    # END OF ONE MASSIVE GROUP
    #
    #################################################

    return render(
        request,
        "Lobby/TGZtournamentMain.html",
        {"tournamentData": tournamentData, "tournamentKey": tournamentKey},
    )


@login_required
def setStopEmails(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    profile = Profile.objects.get(user=request.user)
    stopEmailsUntil = profile.stopEmailsUntil

    if stopEmailsUntil is None:
        # Round the Unix timestamp to the nearest minute
        stopEmailsUntil = round(time.time() / 60)
        stopEmailsUntil += 61
    else:
        stopEmailsUntil = None

    profile.stopEmailsUntil = stopEmailsUntil
    profile.save()

    return JsonResponse({"result": stopEmailsUntil}, safe=False)


@login_required
def dataCheck(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    try:
        jsonData = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data."}, status=400)

    # 1. Check Available Count First (Lightest Queries)
    available_count = Mini_Tournaments.objects.filter(tournamentStatus="OP").count()

    # Add all unified model games (CNS, WEB, etc.)
    available_count += Game.objects.filter(gameStatus="AVAILABLE").count()

    for model in GAME_MODELS:
        available_count += model.objects.filter(gameStatus="AVAILABLE").count()

    if available_count != jsonData.get("availableCount", 0):
        return JsonResponse({"latest": False})

    # 2. Check Invitations Count (Medium Queries)
    invitations_count = 0

    # Add all unified model game invitations
    invitations_count += Game.objects.filter(
        gameStatus="WAITING",
        invitedPlayers=request.user
    ).count()

    for model in GAME_MODELS:
        invitations_count += model.objects.filter(
            gameStatus="WAITING", invitedPlayers=request.user
        ).count()

    if invitations_count != jsonData.get("invitationsCount", 0):
        return JsonResponse({"latest": False})

    # 3. Check My Move Count (Heaviest Logic)
    # Check cache first to stay at 0 hits for this section
    user_name = request.user.username

    my_move_count = 0

    # Add all unified model games my move count
    unified_active_games = Game.objects.filter(
        gameStatus="ACTIVE",
        players__player=request.user
    ).exclude(
        players__is_missing=True,
        players__player=request.user
    ).prefetch_related('players__player').distinct()

    for g in unified_active_games:
        if g.presenter().quickIsMyMove(user_name):
            my_move_count += 1

    for model in GAME_MODELS:
        active_games = (
            model.objects.filter(allPlayers=request.user, gameStatus="ACTIVE")
            .exclude(missingPlayers=request.user)
            .only("id", "currentPlayers")
        )
        my_move_count += sum(1 for g in active_games if g.quickIsMyMove(user_name))

    if my_move_count != jsonData.get("myMoveCount", 0):
        return JsonResponse({"latest": False})
    # If all checks pass
    return JsonResponse({"latest": True})


@login_required()
def addWebhook(request):
    # Joining a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "Invalid Request method"}, status=400)

    webhookType = request.POST["webhookType"]
    webhookURL = (
        request.POST.get("webhookURL", "") if "webhookURL" in request.POST else ""
    )
    webhookUserID = (
        request.POST.get("webhookUserID", "") if "webhookType" in request.POST else ""
    )

    #### LENGTHS
    if len(webhookURL) > 200 or len(webhookUserID) > 50:
        error_string = gettext("Entry too long")
        messages.error(request, error_string)
        return redirect("profile")
    ######## URLs
    # First validate the URL UNLESS adding telegram
    if webhookType != "TG":
        try:
            URLValidator()(webhookURL)
        except ValidationError:
            error_string = gettext("Please enter a valid webhook URL")
            messages.error(request, error_string)
            return redirect("profile")

    # Valid URL, so check discord patterns
    if (
        webhookType == "DC"
        and webhookURL[0:15] != "https://discord"
        and webhookURL[0:19] != "https://ptb.discord"
        and webhookURL[0:18] != "https://discordapp"
    ):
        error_string = gettext("Please enter a Valid Discord Webhook URL")
        messages.error(request, error_string)
        return redirect("profile")

    # Valid URL, so check Slack patterns
    if webhookType == "SL" and webhookURL[0:33] != "https://hooks.slack.com/services/":
        error_string = gettext("Please enter a Valid Slack Webhook URL")
        messages.error(request, error_string)
        return redirect("profile")

    # Validate Slack Member ID (optional, like Discord)
    if webhookType == "SL" and len(webhookUserID) != 0:
        slack_member_id = webhookUserID
        if slack_member_id and len(slack_member_id) < 8:
            error_string = gettext(
                "Slack Member ID must be a valid alphanumeric ID (e.g., U123ABC456)"
            )
            return JsonResponse({"errorMessage": error_string, "type": 1})
        if slack_member_id and not slack_member_id.replace("U", "").isalnum():
            error_string = gettext(
                "Slack Member ID must be alphanumeric (starts with U)"
            )
            return JsonResponse({"errorMessage": error_string, "type": 1})

    # If DC, check valid Discord ID:
    if webhookType == "DC" and len(webhookUserID) != 0 and len(webhookUserID) < 18:
        error_string = gettext("Discord User ID must be an 18+ digit number")
        messages.error(request, error_string)
        return redirect("profile")
    if webhookType == "DC" and len(webhookUserID) != 0 and not webhookUserID.isdigit():
        error_string = gettext("Discord User ID must be an 18+ digit number")
        messages.error(request, error_string)
        return redirect("profile")

    # If telegram, should be a number
    if webhookType == "TG":
        if len(webhookUserID) == 0:
            error_string = gettext("Please enter a Telegram user ID")
            messages.error(request, error_string)
            return redirect("profile")
        if len(webhookUserID) != 0 and not webhookUserID.isdigit():
            error_string = gettext("Telegram user ID is normally a 10 digit number")
            messages.error(request, error_string)
            return redirect("profile")

    # Now it is valid, so add it to the profile
    profile = Profile.objects.get(user=request.user)
    currentWebhooks = (
        json.loads(profile.webhooks)
        if profile.webhooks != "" and profile.webhooks is not None
        else []
    )
    if len(currentWebhooks) >= 6:
        error_string = gettext("Too many webhooks already added")
        messages.error(request, error_string)
        return redirect("profile")

    currentWebhooks.append([webhookType, webhookURL, webhookUserID])
    profile.webhooks = json.dumps(currentWebhooks, separators=(",", ":"))
    profile.save()
    messages.success(request, gettext("Webhook Added"))
    return redirect("profile")


@login_required()
def deleteWebhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid Request method"}, status=400)

    webhookID = request.POST["webhookID"]
    webhookURL = (
        request.POST.get("webhookURL", "") if "webhookURL" in request.POST else ""
    )
    webhookUserID = (
        request.POST.get("webhookUserID", "") if "webhookUserID" in request.POST else ""
    )

    profile = Profile.objects.get(user=request.user)
    currentWebhooks = (
        json.loads(profile.webhooks)
        if profile.webhooks != "" and profile.webhooks is not None
        else []
    )
    if len(currentWebhooks) == 0:
        error_string = gettext("No webhooks to delete")
        messages.error(request, error_string)
        return redirect("profile")

    if (currentWebhooks[int(webhookID)][1] != webhookURL) or (
        currentWebhooks[int(webhookID)][2] != webhookUserID
    ):
        error_string = gettext("Error finding webhook to delete")
        messages.error(request, error_string)
        return redirect("profile")

    currentWebhooks.pop(int(webhookID))
    profile.webhooks = json.dumps(currentWebhooks, separators=(",", ":"))
    profile.save()
    messages.success(request, gettext("Webhook Deleted"))
    return redirect("profile")


@login_required
@require_POST
def sendAdminMessage(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        message = data.get("message")

        if message:  # Check if webhook URL is available
            SN_sendAdminErrorMessage(request, message)  # Call your existing function
            return JsonResponse({"status": "success"}, status=200)
        else:
            return JsonResponse(
                {"status": "error", "message": "Missing message or webhook URL"},
                status=400,
            )
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@login_required
def BGH_API(request, options):
    url = "http://api.boardgamehelpers.com/api/FoodChainMagnate/GenerateMap/" + options

    response = requests.get(url)
    data = response.json()
    final_dictionary = {}
    try:
        final_dictionary = eval(data)
    except Exception as e:
        print("BGH API Error: " + str(e) + " Data: " + str(data))

    try:
        print(
            f"BGH API:: User: {request.user.username}   Options: {options}   Data: {final_dictionary['view_map_url']}"
        )
    except Exception:
        print("BGH PRINT ERROR")

    return JsonResponse(final_dictionary)  # , safe=False)


@login_required
def kbbrScraper(request, game):
    ALLOWED_USERS_SCRAPER = ["admin", "DodgerB", "kbbr"]
    if request.user.username not in ALLOWED_USERS_SCRAPER:
        return redirect("index")
    game_in_use_model = FCM_Game
    if game == "HC":
        game_in_use_model = HC_Game
    if game == "Bus":
        game_in_use_model = Bus_Game
    if game == "TGZ":
        game_in_use_model = TGZ_Game

    query = Q(gameStatus="FINISHED") & ~Q(
        allPlayers__username="admin"
    )  # & ~Q(allPlayers__username="SHADOW") & ~Q(statsExcludedGame=True)

    matching_games = game_in_use_model.objects.filter(query)
    # For each game, [gameID, gameType]

    response_data = {
        "finished_games": [
            [
                getattr(game, "id"),
                (
                    1
                    if "SHADOW" in game.allPlayers.values_list("username", flat=True)
                    else (
                        2
                        if hasattr(game, "relatedTournament")
                        and getattr(game, "relatedTournament", None) is not None
                        else 0
                    )
                ),
            ]
            for game in matching_games
        ]
    }

    return JsonResponse(response_data)


###################################
#
#   MINI TOURNAMENT VIEWS
#
#####################################
@login_required
def addPlayerToMTinvites(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid Request method"}, status=400)

    jsonData = json.loads(request.body)

    try:
        user = User.objects.get(username=jsonData["username"])
        if user is not None:
            if user.username == request.user.username:
                return JsonResponse({"success": 3})
            return JsonResponse({"success": 1}, status=200)
    except User.DoesNotExist:
        return JsonResponse({"success": 2}, status=200)

    return JsonResponse({"success": 1}, status=200)


@login_required()
def MiniTournaments(request):
    available_MT_raw = Mini_Tournaments.objects.filter(tournamentStatus="OP").order_by(
        "-created"
    )
    current_MT_raw = Mini_Tournaments.objects.filter(tournamentStatus="IP").order_by(
        "-created"
    )
    finished_MT_raw = Mini_Tournaments.objects.filter(tournamentStatus="FN").order_by(
        "-created"
    )
    available_MT = [
        available_MT_raw_item.serialize() for available_MT_raw_item in available_MT_raw
    ]
    current_MT = [
        current_MT_raw_item.serialize() for current_MT_raw_item in current_MT_raw
    ]
    finished_MT = [
        finished_MT_raw_item.serialize() for finished_MT_raw_item in finished_MT_raw
    ]
    return render(
        request,
        "Lobby/tournaments/AllMiniTournaments.html",
        {
            "available_MT": available_MT,
            "current_MT": current_MT,
            "finished_MT": finished_MT,
        },
    )


@login_required()
def MiniTournament(request, Mini_Tournament_id):
    if request.method == "POST":
        try:
            Mini_Tournament = Mini_Tournaments.objects.get(id=Mini_Tournament_id)
        except Exception:
            raise Http404(gettext("Tournament does not exist"))
        # First check if it is a person declining an invite
        if "declineInvite" in request.POST and request.POST["declineInvite"] == "true":
            Mini_Tournament = Mini_Tournaments.objects.get(id=Mini_Tournament_id)
            Mini_Tournament.startingPlayers.remove(request.user)
            Mini_Tournament.invitedPlayers.remove(request.user)
            Mini_Tournament.save()
            messages.success(
                request, (gettext("You have declined the tournament invitation"))
            )
            return HttpResponseRedirect(
                reverse(
                    "MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id}
                )
            )

        if "understand_movement" not in request.POST:
            messages.error(
                request, gettext("Please tick to confirm you can move regularly")
            )
            HttpResponseRedirect(
                reverse(
                    "MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id}
                )
            )

        # Always remove from invited just in case
        Mini_Tournament.invitedPlayers.remove(request.user)

        if (
            Mini_Tournament
            and Mini_Tournament.startingPlayers.count()
            < Mini_Tournament.maxTournamentPlayers
        ):
            Mini_Tournament.startingPlayers.add(request.user)
            Mini_Tournament.save()
            if (
                Mini_Tournament.startingPlayers.count()
                == Mini_Tournament.maxTournamentPlayers
            ):
                SF_startAnyTournament(request, MINI_T_FLAG, Mini_Tournament)
            messages.success(request, (gettext("You have joined the Tournament")))
        else:
            messages.error(request, gettext("The Tournament is already full"))
        return HttpResponseRedirect(
            reverse("MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id})
        )

    try:
        Mini_Tournament = Mini_Tournaments.objects.get(id=Mini_Tournament_id)
    except Exception:
        raise Http404(gettext("Tournament does not exist"))

    # Common items
    chatData = Mini_Tournament.chatData
    startingOptionsHTML = ""
    if Mini_Tournament.gameCode == "FCM":
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(
            Mini_Tournament.startingOptions
        )
        if startingOptionsHTML == "[None]":
            startingOptionsHTML = "(No Starting Options)"
    elif Mini_Tournament.gameCode == "TGZ":
        startingOptionsHTML = SR_getTGZstartingOptionsHTML(
            Mini_Tournament.startingOptions
        )

    pointsValues = {}
    if Mini_Tournament.tournamentType == "PT":
        pointsValues["normal"] = []
        for i in range(Mini_Tournament.maxGamePlayers):
            entry = []
            if i == 0:
                entry.append("1st")
            elif i == 1:
                entry.append("2nd")
            elif i == 2:
                entry.append("3rd")
            elif i == 3:
                entry.append("4th")
            elif i == 4:
                entry.append("5th")
            elif i == 5:
                entry.append("6th")
            entry.append(SR_getPointsForPosition(i, Mini_Tournament.maxGamePlayers))
            pointsValues["normal"].append(entry)
        pointsValues["bye"] = SR_getPointsForPosition(
            99, Mini_Tournament.maxGamePlayers
        )
    returnData = {
        "tournament": Mini_Tournament,
        "gameType": Mini_Tournament.gameCode,
        "startingOptionsHTML": startingOptionsHTML,
        "MT_CreationTimestamp": Mini_Tournament.created,
        "MT_ID": Mini_Tournament_id,
        "chatData": chatData,
        "creator": (
            Mini_Tournament.creator.username
            if Mini_Tournament.creator is not None
            else "None"
        ),
        "pointsValues": pointsValues,
    }

    if (
        Mini_Tournament.tournamentStatus == "OP"
        or Mini_Tournament.tournamentStatus == "PR"
    ):
        invitedPlayerList = [
            User.username for User in Mini_Tournament.invitedPlayers.all()
        ]
        invitedPlayerString = ", ".join(invitedPlayerList)
        openSlots = []
        for i in range(
            Mini_Tournament.startingPlayers.count() + 1,
            Mini_Tournament.maxTournamentPlayers + 1,
        ):
            openSlots.append(str(i))
        returnData.update(
            {
                "openSlots": openSlots,
                "isSignedUp": Mini_Tournament.isSignedUp(request.user),
                "isInvitedPlayer": Mini_Tournament.isInvitedPlayer(request.user),
                "invitedPlayerString": invitedPlayerString,
            }
        )
        return render(
            request,
            "Lobby/tournaments/MiniTournament.html",
            returnData,
        )

    if (
        Mini_Tournament
        and Mini_Tournament.tournamentStatus == "IP"
        or Mini_Tournament
        and Mini_Tournament.tournamentStatus == "FN"
    ):
        winnerHTML = ""
        if Mini_Tournament.tournamentStatus == "FN":
            winnersData = json.loads(Mini_Tournament.winnersData)
            winnersData = winnersData[0]
            winnerHTML = "Winner"
            if len(winnersData) > 1:
                winnerHTML += "s"
            winnerHTML += ": "
            for index, name in enumerate(winnersData):
                winnerHTML += "<B>" + name + "</B>"
                if index + 1 != len(winnersData):
                    winnerHTML += ", "
        returnData.update(
            {
                "playersData": SR_getAnyTournamentPlayersData(Mini_Tournament),
                "roundsData": SR_getAnyTournamentRoundsData(Mini_Tournament),
                "winnerHTML": winnerHTML,
                "winnersData": (
                    json.loads(Mini_Tournament.winnersData)
                    if Mini_Tournament.winnersData
                    else []
                ),
            }
        )
        return render(
            request,
            "Lobby/tournaments/MiniTournament.html",
            returnData,
        )

    # Un-needed default return
    return render(request, "Lobby/tournaments/MiniTournament.html")


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = "dbmutex_" + name
    cursor = connection.cursor()
    got_lock = False  # Initialize got_lock to False
    try:
        # timeout returns with error
        cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
        ((got,),) = cursor.fetchall()
        got_lock = bool(got)  # Convert to boolean for clarity

        if got_lock:
            yield  # Execute the code within the 'with' block
        else:
            # time out or can't open?
            print("ERROR: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(f"ERROR: Failed to release lock {mutex_name}: {e}")  # Log error


@login_required()
def sendMTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    MT_ID = jsonData["MT_ID"]

    with db_mutex("lockMT_" + str(MT_ID)):
        return _sendMTchatMessage(request)


@login_required()
def _sendMTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    MT_ID = jsonData["MT_ID"]
    new_entry = jsonData["newEntry"]
    new_entry.insert(0, request.user.username)

    currentMT = Mini_Tournaments.objects.get(id=MT_ID)

    currentChatData = []
    base64_data = currentMT.chatData if currentMT.chatData else ""
    if len(base64_data) > 0:
        compressed_data = base64.b64decode(base64_data)
        unzipped = gzip.decompress(compressed_data).decode("utf-8")
        currentChatData = json.loads(unzipped)
    currentChatData.insert(0, new_entry)

    json_string = json.dumps(currentChatData, separators=(",", ":"))
    compressed_data = gzip.compress(json_string.encode("utf-8"))
    compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

    currentMT.chatData = compressedChatData

    currentMT.save()

    return JsonResponse({"chatData": compressedChatData})


@login_required
def reloadMTchatData(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        Mini_Tournament = Mini_Tournaments.objects.get(id=jsonData["MT_ID"])
    except Mini_Tournaments.DoesNotExist:
        raise Http404(gettext("Mini Tournament does not exist"))

    return JsonResponse(
        {"chatData": Mini_Tournament.chatData},
        safe=True,
    )


@login_required
def createFCMminiTournament(request):
    # experienced = SF_hasRequiredExperience(request, "FCM", FCM_Game)
    if request.method != "POST":
        return render(
            request,
            "Lobby/createFCM.html",
            {
                "experienced": False,
                "MT_Creation": True,
            },
        )

    # Now it is a POST response
    startgOptions = buildFCMstartingOptions(request.POST)
    invitedPlayers = (
        json.loads(request.POST["invtedPlayersListMT"])
        if request.POST["invtedPlayersListMT"]
        else []
    )
    if "allowRewind" in request.POST:
        startgOptions = startgOptions + ",99" if startgOptions != "" else "99"

    with transaction.atomic():
        newTournament = Mini_Tournaments.objects.create(
            gameCode="FCM",
            tournamentName=request.POST["tournamentName"],
            tournamentDescription=request.POST["tournamentDescription"],
            tournamentStatus="OP",
            tournamentType=request.POST["tournamentFormat"],
            startingOptions=startgOptions,
            maxTournamentPlayers=request.POST["totalPlayersMT"],
            maxGamePlayers=request.POST["playersPerGameMT"],
            roundsBeforeKnockout=4,
            creator=request.user,
        )
        newTournament.startingPlayers.add(request.user)
        if "privateTournament" in request.POST:
            newTournament.tournamentStatus = "PR"

        for username in invitedPlayers:
            user = User.objects.get(username=username)
            newTournament.invitedPlayers.add(user)

        newTournament.save()

    SN_sendMiniTournamentInvite(
        request,
        invitedPlayers,
        newTournament.gameCode,
        newTournament.tournamentName,
        newTournament.tournamentDescription,
        newTournament.maxTournamentPlayers,
        newTournament.maxGamePlayers,
        SR_getTournamentTypeDisplay(newTournament.tournamentType),
        newTournament.id,
    )

    messages.success(
        request, SF_getMiniTournamentCreationJsonReturn(getattr(newTournament, "id"))
    )
    return HttpResponseRedirect(
        reverse("indexListType", kwargs={"listType": "waiting"})
    )


def createTGZminiTournament(request):
    if request.method != "POST":
        return render(
            request,
            "Lobby/createTGZ.html",
            {
                "experienced": False,
                "MT_Creation": True,
            },
        )

    # Now it is a POST response
    startingOptions = []
    if "useSchism" in request.POST and "schismRadio" in request.POST:
        startingOptions.append(int(request.POST.get("schismRadio")))

    if "enableAdvancedOptions" in request.POST:
        startingOptions.extend(SF_TGZadvancedOptions(request))
        for entry in startingOptions:
            if (
                isinstance(entry, list)
                and entry
                and entry[0] == 90
                and any(12 <= num <= 23 for num in entry)
            ):
                startingOptions.append(7)
                break

    invitedPlayers = (
        json.loads(request.POST["invtedPlayersListMT"])
        if request.POST["invtedPlayersListMT"]
        else []
    )

    with transaction.atomic():
        newTournament = Mini_Tournaments.objects.create(
            gameCode="TGZ",
            tournamentName=request.POST["tournamentName"],
            tournamentDescription=request.POST["tournamentDescription"],
            tournamentStatus="OP",
            tournamentType=request.POST["tournamentFormat"],
            startingOptions=startingOptions,
            maxTournamentPlayers=request.POST["totalPlayersMT"],
            maxGamePlayers=request.POST["playersPerGameMT"],
            roundsBeforeKnockout=4,
            creator=request.user,
        )
        newTournament.startingPlayers.add(request.user)
        if "privateTournament" in request.POST:
            newTournament.tournamentStatus = "PR"

        for username in invitedPlayers:
            user = User.objects.get(username=username)
            newTournament.invitedPlayers.add(user)

        newTournament.save()

    SN_sendMiniTournamentInvite(
        request,
        invitedPlayers,
        newTournament.gameCode,
        newTournament.tournamentName,
        newTournament.tournamentDescription,
        newTournament.maxTournamentPlayers,
        newTournament.maxGamePlayers,
        SR_getTournamentTypeDisplay(newTournament.tournamentType),
        newTournament.id,
    )

    messages.success(
        request, SF_getMiniTournamentCreationJsonReturn(getattr(newTournament, "id"))
    )
    return HttpResponseRedirect(
        reverse("indexListType", kwargs={"listType": "waiting"})
    )


###################################
#
#   MAIN TOURNAMENT VIEWS - MAIN-T
#
#####################################
@login_required()
def MainTournaments(request):
    available_MainT_raw = Main_Tournament.objects.filter(
        tournamentStatus="OP"
    ).order_by("-created")
    current_MainT_raw = Main_Tournament.objects.filter(tournamentStatus="IP").order_by(
        "-created"
    )
    finished_MainT_raw = Main_Tournament.objects.filter(tournamentStatus="FN").order_by(
        "-created"
    )
    available_MainT = [
        available_MainT_raw_item.serialize()
        for available_MainT_raw_item in available_MainT_raw
    ]
    current_MainT = [
        current_MainT_raw_item.serialize()
        for current_MainT_raw_item in current_MainT_raw
    ]
    finished_MainT = [
        finished_MainT_raw_item.serialize()
        for finished_MainT_raw_item in finished_MainT_raw
    ]
    return render(
        request,
        "Lobby/Main_Tournaments/AllMainTournaments.html",
        {
            "available_MainT": available_MainT,
            "current_MainT": current_MainT,
            "finished_MainT": finished_MainT,
        },
    )


@login_required()
def MainTournament(request, Main_Tournament_id):
    if request.method == "POST":
        try:
            currentTournament = Main_Tournament.objects.get(id=Main_Tournament_id)
        except Main_Tournament.DoesNotExist:
            raise Http404(gettext("Tournament does not exist"))

        if "understand_movement" not in request.POST:
            messages.error(
                request, gettext("Please tick to confirm you can move regularly")
            )
            HttpResponseRedirect(
                reverse(
                    "MainTournament", kwargs={"Main_Tournament_id": Main_Tournament_id}
                )
            )

        if (
            currentTournament
            and currentTournament.startingPlayers.count()
            < currentTournament.maxTournamentPlayers
        ):
            currentTournament.startingPlayers.add(request.user)
            currentTournament.save()
            if (
                currentTournament.startingPlayers.count()
                == currentTournament.maxTournamentPlayers
            ):
                SF_startAnyTournament(request, MAIN_T_FLAG, currentTournament)
            messages.success(request, (gettext("You have joined the Tournament")))
        else:
            messages.error(request, gettext("The Tournament is already full"))
        return HttpResponseRedirect(
            reverse("MainTournament", kwargs={"Main_Tournament_id": Main_Tournament_id})
        )

    try:
        currentTournament = Main_Tournament.objects.get(id=Main_Tournament_id)
    except Main_Tournament.DoesNotExist:
        raise Http404(gettext("Tournament does not exist"))

    # Common items
    chatData = currentTournament.chatData
    startingOptionsHTML = ""
    if currentTournament.gameCode == "FCM":
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(
            currentTournament.startingOptions
        )
        if startingOptionsHTML == "[None]":
            startingOptionsHTML = "(No Starting Options)"
    elif currentTournament.gameCode == "TGZ":
        startingOptionsHTML = SR_getTGZstartingOptionsHTML(
            currentTournament.startingOptions
        )

    pointsValues = {}
    if currentTournament.tournamentType == "PT":
        pointsValues["normal"] = []
        for i in range(currentTournament.maxGamePlayers):
            entry = []
            if i == 0:
                entry.append("1st")
            elif i == 1:
                entry.append("2nd")
            elif i == 2:
                entry.append("3rd")
            elif i == 3:
                entry.append("4th")
            elif i == 4:
                entry.append("5th")
            elif i == 5:
                entry.append("6th")
            entry.append(SR_getPointsForPosition(i, currentTournament.maxGamePlayers))
            pointsValues["normal"].append(entry)
        pointsValues["bye"] = SR_getPointsForPosition(
            99, currentTournament.maxGamePlayers
        )
    returnData = {
        "tournament": currentTournament,
        "gameCode": currentTournament.gameCode,
        "startingOptionsHTML": startingOptionsHTML,
        "MainT_CreationTimestamp": currentTournament.created,
        "MainT_ID": Main_Tournament_id,
        "chatData": chatData,
        "pointsValues": pointsValues,
    }

    if currentTournament.tournamentStatus == "OP":
        openSlots = []
        for i in range(
            currentTournament.startingPlayers.count() + 1,
            currentTournament.maxTournamentPlayers + 1,
        ):
            openSlots.append(str(i))
        returnData.update(
            {
                "openSlots": openSlots,
                "isSignedUp": currentTournament.isSignedUp(request.user),
            }
        )
        return render(
            request,
            "Lobby/tournaments/MainTournament.html",
            returnData,
        )

    if (
        currentTournament
        and currentTournament.tournamentStatus == "IP"
        or currentTournament
        and currentTournament.tournamentStatus == "FN"
    ):
        winnerHTML = ""
        if currentTournament.tournamentStatus == "FN":
            winnersData = json.loads(currentTournament.winnersData)
            winnersData = winnersData[0]
            winnerHTML = "Winner"
            if len(winnersData) > 1:
                winnerHTML += "s"
            winnerHTML += ": "
            for index, name in enumerate(winnersData):
                winnerHTML += "<B>" + name + "</B>"
                if index + 1 != len(winnersData):
                    winnerHTML += ", "

        roundsData = SR_getAnyTournamentRoundsData(currentTournament)
        # For R2 of MG, need to split into groups
        if currentTournament.tournamentType == "MG" and len(roundsData) >= 2:
            idx = 0
            if len(roundsData) == 3:
                idx = 1

            roundsData[idx]["groups"] = []
            groupA = roundsData[idx]["gamesData"][:7]
            groupB = roundsData[idx]["gamesData"][7:]
            roundsData[idx]["groups"].append(groupA)
            roundsData[idx]["groups"].append(groupB)

        returnData.update(
            {
                "playersData": SR_getAnyTournamentPlayersData(currentTournament),
                "roundsData": roundsData,
                "winnerHTML": winnerHTML,
                "winnersData": (
                    json.loads(currentTournament.winnersData)
                    if currentTournament.winnersData
                    else []
                ),
            }
        )
        return render(
            request,
            "Lobby/tournaments/MainTournament.html",
            returnData,
        )

    # Un-needed default return
    return render(request, "Lobby/tournaments/MainTournament.html")


@login_required()
def sendMainTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    MainT_ID = jsonData["MainT_ID"]

    with db_mutex("lockMainT_" + str(MainT_ID)):
        return _sendMainTchatMessage(request)


@login_required()
def _sendMainTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    MainT_ID = jsonData["MainT_ID"]
    new_entry = jsonData["newEntry"]
    new_entry.insert(0, request.user.username)

    currentMainT = Main_Tournament.objects.get(id=MainT_ID)

    currentChatData = []
    base64_data = currentMainT.chatData if currentMainT.chatData else ""
    if len(base64_data) > 0:
        compressed_data = base64.b64decode(base64_data)
        unzipped = gzip.decompress(compressed_data).decode("utf-8")
        currentChatData = json.loads(unzipped)
    currentChatData.insert(0, new_entry)

    json_string = json.dumps(currentChatData, separators=(",", ":"))
    compressed_data = gzip.compress(json_string.encode("utf-8"))
    compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

    currentMainT.chatData = compressedChatData

    currentMainT.save()

    return JsonResponse({"chatData": compressedChatData})


@login_required
def reloadMainTchatData(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentTournament = Main_Tournament.objects.get(id=jsonData["MainT_ID"])
    except Main_Tournament.DoesNotExist:
        raise Http404(gettext("Main Tournament does not exist"))

    return JsonResponse(
        {"chatData": currentTournament.chatData},
        safe=True,
    )


def createTGZmainTournament(request):
    if request.method != "POST":
        return render(
            request,
            "Lobby/createTGZ.html",
            {
                "experienced": False,
                "MainT_Creation": True,
            },
        )

    # Now it is a POST response
    startingOptions = json.dumps(
        SF_TGZadvancedOptions(request)
        if "enableAdvancedOptions" in request.POST
        else []
    )

    with transaction.atomic():
        newTournament = Main_Tournament.objects.create(
            gameCode="TGZ",
            tournamentName=request.POST["tournamentName"],
            tournamentDescription=request.POST["tournamentDescription"],
            tournamentStatus="OP",
            tournamentType=request.POST["tournamentFormat"],
            startingOptions=startingOptions,
            maxTournamentPlayers=request.POST["totalPlayersMainT"],
            maxGamePlayers=request.POST["playersPerGameMainT"],
            roundsBeforeKnockout=4,
        )
        newTournament.startingPlayers.add(request.user)
        if "privateTournament" in request.POST:
            newTournament.tournamentStatus = "PR"

        newTournament.save()

    messages.success(request, "Your Tournament has been created")
    return HttpResponseRedirect(
        reverse("indexListType", kwargs={"listType": "waiting"})
    )
