import base64
import datetime
import gzip
import json
import logging
import re
import time
import traceback
from collections import Counter

# import hashlib
# import urllib
# from random import randint
from datetime import timedelta

import requests

# from telegram import Update
# from telegram.ext import Application, CommandHandler, ContextTypes
from decouple import config
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import (
    authenticate,
    get_user,
    get_user_model,
    login,
    logout,
    update_session_auth_hash,
)
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import BadHeaderError, send_mail
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.core.validators import URLValidator
from django.db import connection, transaction
from django.db.models import Count, Max, Prefetch, Q
from django.db.models.expressions import RawSQL
from django.db.models.functions import TruncDate
from django.http import (
    Http404,
    HttpResponse,
    HttpResponsePermanentRedirect,
    HttpResponseRedirect,
    JsonResponse,
)
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone, translation
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    url_has_allowed_host_and_scheme,
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from django.utils.safestring import mark_safe
from django.utils.translation import gettext  # , get_language
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.generic import View
from django.views.i18n import set_language as django_set_language
from user_visit.models import UserVisit

import Lobby.sharedFunctions.constants as rf
from FCM.common import buildFCMstartingOptions
from Lobby.sharedFunctions.db_mutex import db_mutex
from Lobby.sharedFunctions.sharedFunctions import (
    SF_fastSerializeGame,
    SF_getMiniTournamentCreationJsonReturn,
    SF_getRequiredExp,
    SF_hasRequiredExperience,
    SF_serializeGame,
    SF_startAnyTournament,
    SF_TGZadvancedOptions,
)
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage, SN_sendDiscordDM
from Lobby.sharedFunctions.sharedRefs import (
    OPEN,
    PENDING,
    PRIVATE,
    SR_WEBHOOK_CHOICES,
    SR_getAnyTournamentPlayersData,
    SR_getAnyTournamentRoundsData,
    SR_getFCMstartingOptionsHTML,
    SR_getgodsVRoptionsHTML,
    SR_getPointsForPosition,
    SR_getTGZstartingOptionsHTML,
    SR_getTournamentTypeDisplay,
)

from .forms import (
    NewUserForm,
    PasswordChangeCustomForm,
    PasswordResetFormCustom,
    UpdateProfileForm,
    changelogForm,
)
from .models import (
    Game,
    GamePlayer,
    Profile,
    Tournament,
    changelog,
)
from .tokens import account_activation_token

User = get_user_model()

logger = logging.getLogger(__name__)

ALLOWED_SPECIAL_USERS = [
    "33",
    "Acacia",
    "Batch",
    "Beezy",
    "Benkyo",
    "BigBad",
    "BotKickStarter",
    "Brent",
    "Burmer",
    "DodgerB",
    "Dopple",
    "Dycu",
    "F1087",
    "Ftep",
    "Gauss",
    "Hohohale",
    "Jasonbartfast",
    "JoshuaAcosta",
    "Jungy",
    "Juni",
    "Kawlos",
    "Lemem",
    "Melk0r",
    "PhasingPlayer",
    "RJ_E",
    "Rastko",
    "RedWater",
    "SaintJason",
    "Shoopuffman",
    "Steveth",
    "Strange8ractor",
    "TDUBZ",
    "admin",
    "burmer",
    "craggybackhand",
    "durendal",
    "enavico",
    "gdc",
    "h",
    "ha.steven",
    "huddyrx",
    "jmelliere",
    "joshuastarr",
    "kbbr",
    "krieg90",
    "looogic",
    "massibull",
    "michazhn",
    "phil",
    "siddhig",
    "timmymayes",
    "user1",
    "vraid",
    "waymost",
]

##########################
#
#   Attempt at Telegram Bot. VERSION 2 - 2026
#   Currently Disabled; using seperate python server
#
##########################


# Constants
API_TOKEN = config("TELEGRAM_OBG_BOT_TOKEN", default="BOT_TOKEN", cast=str)
BOT_URL = f"https://api.telegram.org/bot{API_TOKEN}/"


def generate_response(user_input: str) -> str:
    normalized_input = user_input.lower()
    if "hi" in normalized_input:
        return "Hello! Use /start or /help to setup notifications"
    if "how are you doing" in normalized_input:
        return "I am functioning properly!"
    return "I didn't understand that - use /start or /help to setup notifications"


def send_telegram_msg(chat_id, text):
    url = BOT_URL + "sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    try:
        response = requests.post(url, json=payload, timeout=7)
        if response.status_code != 200:
            logger.error(f"Telegram API error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")


@csrf_exempt
def telegram_bot_response(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))
            if "message" not in data:
                return HttpResponse("OK")

            message = data["message"]
            chat_id = message["chat"]["id"]
            chat_type = message["chat"]["type"]
            # Extract and clean text safely
            text = message.get("text", "").strip()
            # user = message.get("from", {})

            # Handle Commands
            if text.startswith("/start") or "/start" in text:
                response = f"To easily add Telegram Notifications to your account, click this link:\nhttps://www.OnlineBoardGamers.com/addTGid/{chat_id}\nFor more information use /help"
                send_telegram_msg(chat_id, response)

            elif text.startswith("/help") or "/help" in text:
                response = f"To easily add Telegram Notifications to your account, click this link:\nhttps://www.OnlineBoardGamers.com/addTGid/{chat_id}\nYour Telegram ID is: {chat_id}\nEnter this ID in the Webhooks section of your profile page on OBG:\nhttps://www.onlineboardgamers.com"
                send_telegram_msg(chat_id, response)

            elif text.startswith("/custom") or "/custom" in text:
                send_telegram_msg(
                    chat_id,
                    "This is a custom command, you can put whatever you want here.",
                )

            # Handle Regular Messages
            elif text and not text.startswith("/"):
                # Group logic: only respond if bot is mentioned
                if chat_type == "group":
                    if "@OnlineBoardGamers_Bot" in text:
                        cleaned_text = text.replace("@OnlineBoardGamers_Bot", "").strip()
                        send_telegram_msg(chat_id, generate_response(cleaned_text))
                else:
                    send_telegram_msg(chat_id, generate_response(text))

            return HttpResponse("OK", status=200)

        except Exception as e:
            print(f"WEBHOOK ERROR: {e}")
            return HttpResponse("OK")  # Return 200 to prevent Telegram from retrying on error

    return HttpResponse("Forbidden", status=403)


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
            currentWebhooks = json.loads(profile.webhooks) if profile.webhooks != "" and profile.webhooks is not None else []
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
                gettext("Telegram Notifications added - send a test message (next to your new webhook entry)"),
            )
            return redirect("profile")

    except Profile.DoesNotExist:
        return HttpResponse("Profile not found", status=500)


GAME_NAMES_MODELS = {
    "FCM": "FCM",
    "HLC": "HLC",
    "BUS": "BUS",
    "TGZ": "TGZ",
    "CNS": "CNS",
    "AQY": "AQY",
    "IND": "IND",
    "KFW": "KFW",
    "WEB": "WEB",
    "RNB": "RNB",
}


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


@login_required
def indexSpecialRedirect(request):

    return redirect("index")
    # return HttpResponseRedirect(reverse("RNB:showRNBgame"))
    # return HttpResponseRedirect(reverse("createRNBpage"))


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

    user_stats_data = User.objects.annotate(date_joined_date=TruncDate("date_joined")).values("date_joined_date").annotate(total_users=Count("id")).order_by("date_joined_date")

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

    users_last_login = User.objects.exclude(last_login__isnull=True).exclude(last_login__exact=None).values_list("last_login", flat=True)

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
        last_login_data.append({"date": date.strftime("%Y-%m-%d"), "count": cumulative_count})

    ###### LAST LOGIN BAR CHART ########
    # Query the number of users that last logged in on each day
    user_login_counts = User.objects.exclude(last_login__isnull=True).exclude(last_login__exact=None).annotate(login_date=TruncDate("last_login")).values("login_date").annotate(count=Count("id")).order_by("login_date")

    # Prepare the data for the bar chart
    last_login_data_bar = [{"date": entry["login_date"].strftime("%Y-%m-%d"), "count": entry["count"]} for entry in user_login_counts]

    ###### DIFFERENCE BETWEEN JOIN AND LAST LOGIN ########
    users = User.objects.all()
    durations = []

    for user in users:
        if user.last_login is not None and user.date_joined is not None:
            duration = (user.last_login.date() - user.date_joined.date()).days
            durations.append(duration)

    duration_counts = Counter(durations)

    join_to_last_login_data = [{"days_between": duration, "count": count} for duration, count in duration_counts.items()]

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

    # Load all Game model games at once
    query = Q(gameStatus="ACTIVE") | Q(gameStatus="PRIVATE") | Q(gameStatus="WAITING")

    filtered_games = Game.objects.filter(query).prefetch_related("players__player").select_related("creator")

    # Group by gameCode
    from collections import defaultdict

    games_by_code = defaultdict(list)
    for game in filtered_games:
        games_by_code[game.gameCode].append(game)

    # Count finished games for each filtered_games game code
    for game_code in games_by_code:
        finishedGamesCount += Game.objects.filter(gameCode=game_code, gameStatus="FINISHED").count()

    # Process all filtered_games games
    for _game_code, games in games_by_code.items():
        for singleGame in games:
            presenter = singleGame.presenter()
            timeRemaining = presenter.getSecondsToNextKickout()

            if timeRemaining >= remaining_start_time_expired and timeRemaining <= remaining_finish_time_expired:
                if singleGame.players.filter(player__username="SHADOW").exists():
                    pracGamesCount += 1
                gamesList.append(SF_fastSerializeGame(singleGame, request.user))  # singleGame.serialize(request.user))
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
        "FCM": Game,
        "HLC": Game,
        "BUS": Game,
        "TGZ": Game,
        "CNS": Game,
        "AQY": Game,
        "IND": Game,
        "KFW": Game,
        "WEB": Game,
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
    current_game = model.objects.filter(id=game_id, gameCode=game_type).first()
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
    message = f"=== DELETE GAME HACK ATTEMPT ===\nUser: {request.user.username}\nPath: {request.path}\nEmail: {request.user.email}\n"
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
    if request.user.username == "admin" or request.user.username == "庄生" or request.user.username == "Salfuman" or request.user.username == "mhmnz2":
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
        message = "=== 404 ERROR ===\n"
        message += f"Path: {request.path} [{request.method}]\n"
        message += f"User: {request.user.username if request.user.is_authenticated else 'Anonymous'}\n"

        # --- ADD THIS: Capture POST Data ---
        if request.method == "POST":
            try:
                # If it's JSON (like your FCM data)
                body_data = json.loads(request.body)
                message += f"POST Data: {json.dumps(body_data, indent=2)}\n"
            except Exception:
                # Fallback for non-JSON or malformed data
                message += f"Raw Body (Partial): {request.body[:500]!r}\n"

        if exception.args:
            message += f"Exception Detail: {exception.args[0]}\n"

        if request.user.is_authenticated:
            message += "User: " + request.user.username + "\n"
        else:
            message += "User Not Logged In\n"
        message += "User Is Authenticated: " + str(request.user.is_authenticated) + "\n"
        if request.user.is_authenticated:
            message += "Email: " + request.user.email + "\n"

        if request.user.is_authenticated and request.user.username != "Gamer" and request.user.username != "MMYCC":
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
        except Exception as e:
            print(f"DOUBLE FAILURE in 500: {str(e)}")

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

    currentGamesList = list(Game.objects.filter(players__player=request.user, gameStatus="ACTIVE").exclude(players__is_missing=True, players__player=request.user).distinct().select_related("creator").prefetch_related("players__player"))

    currentGamesList.sort(key=lambda instance: instance.latestUpdate, reverse=True)

    # Filter currentGamesList based on isMyMove function
    filteredGamesList = []
    for game in currentGamesList:
        presenter = game.presenter()
        if presenter.quickIsMyMove(request.user.username):
            filteredGamesList.append(game)

    # Handle cases when there are no filtered games
    if not filteredGamesList:
        return redirect("/")
    if len(filteredGamesList) == 1:
        nextGame = filteredGamesList[0]
        nextID = nextGame.id
        if nextID == current_game_id:
            return redirect("/")
        else:
            # TODO: CHECK - does nextgame.getGameCode() exist?
            nextGameCode = nextGame.getGameCode()
            return redirect(f"/{nextGameCode}/{nextGame.id}/show/")

    # Get the index of the game with the specified game_id
    index = next(
        (i for i, game in enumerate(filteredGamesList) if game.id == current_game_id and game.getGameCode() == current_game_code),
        None,
    )

    # Determine the next game details based on the index
    nextGame = filteredGamesList[0] if index is None or index >= len(filteredGamesList) - 1 else filteredGamesList[index + 1]

    # Construct the nextURL using the next game details
    nextGameCode = nextGame.getGameCode()
    return redirect(f"/{nextGameCode}/{nextGame.id}/show/")


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
                            config("OBG_EMAIL_HOST_USER"),
                            [user.email],
                            fail_silently=False,
                        )
                    except BadHeaderError:
                        return HttpResponse("Invalid header found.")

                    messages.success(
                        request,
                        gettext("An email with password reset instructions has been sent to your inbox. Please check spam folders"),
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

    logger.warning(f"CSRF failure: User: {username}, Redirect from: {redirect_url}, Reason: {reason}")
    logger.debug(f"Request META: {request.META}")
    logger.debug(f"CSRF Cookie: {request.COOKIES.get('csrftoken')}")

    messages.error(
        request,
        gettext("Authentification problem - possibly using another browser tab. Please login here"),
    )
    return render(request, "Lobby/login.html")


# @login_required
# def stats(request):
#    # Try to get data from cache first
#    stats_data = cache.get("global_stats")
#    if not stats_data:
#        # These 2 queries only run once every 5 minutes
#        date_from = timezone.now() - timezone.timedelta(hours=24)
#
#        stats_data = {
#            "totalUsers": User.objects.count(),
#            "userActivity": UserVisit.objects.filter(
#                timestamp__gte=date_from
#            ).aggregate(total=Count("user_id", distinct=True))["total"],
#        }
#        cache.set("global_stats", stats_data, 300)  # Cache for 300 seconds
#
#    # Define metadata once to keep logic DRY
#    GAME_META = {
#        "FCM": {"name": "Food Chain Magnate", "gameCode": "FCM"},
#        "HLC": {"name": "Horseless Carriage", "gameCode": "HLC"},
#        "BUS": {"name": "Bus", "gameCode": "BUS"},
#        "TGZ": {"name": "The Great Zimbabwe", "gameCode": "TGZ"},
#        "CNS": {"name": "CNS", "gameCode": "CNS"},
#        "AQY": {"name": "Antiquity", "gameCode": "AQY"},
#        "IND": {"name": "Indonesia", "gameCode": "IND"},
#        "KFW": {"name": "KFW", "gameCode": "KFW"},
#        "WEB": {"name": "WEB", "gameCode": "WEB"},
#    }
#
#    # Unpack cached data
#    totalUsers = stats_data["totalUsers"]
#    userActvitiy = stats_data["userActivity"]
#    # Initialize counts and lists
#    latestGames = []
#    latestGamesFinished = []
#
#    excluded_names = ["SHADOW", "FcmAI"]
#    stats_map = {}  # Using a dict temporarily to collect data
#
#    # Split Game model by gameCode
#    for game_code in ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB"]:
#        counts_key = f"counts_Game_{game_code}"
#        counts = cache.get(counts_key)
#
#        if not counts:
#            qs = (
#                Game.objects.filter(gameCode=game_code)
#                .exclude(players__player__username__in=excluded_names)
#                .distinct()
#            )
#            counts = {
#                "active": qs.filter(gameStatus="ACTIVE").count(),
#                "finished": qs.filter(gameStatus="FINISHED").count(),
#            }
#            cache.set(counts_key, counts, 60)
#
#        stats_map[game_code] = {**GAME_META.get(game_code, {}), **counts}
#
#        # Fetch latest
#        latestGames.extend(
#            Game.objects.filter(gameCode=game_code, gameStatus="ACTIVE")
#            .exclude(players__player__username__in=excluded_names)
#            .distinct()
#            .order_by("-latestUpdate")[:10]
#        )
#        latestGamesFinished.extend(
#            Game.objects.filter(gameCode=game_code, gameStatus="FINISHED")
#            .exclude(players__player__username__in=excluded_names)
#            .distinct()
#            .order_by("-latestUpdate")[:10]
#        )
#
#    # Do this to match game order in GAME_META
#    game_stats = []
#    for code in GAME_META.keys():
#        # Only add to the list if we actually found data for this game
#        if code in stats_map:
#            game_stats.append(stats_map[code])
#    # game_stats = list(stats_map.values())
#
#    # Calculate grand totals
#    totalGames = sum(g["active"] for g in game_stats)
#    finishedGames = sum(g["finished"] for g in game_stats)
#
#    # Sort the latest games by latestUpdate
#    latestGames.sort(key=lambda game: game.latestUpdate, reverse=True)
#    latestGamesFinished.sort(key=lambda game: game.latestUpdate, reverse=True)
#    # latestGames.sort(key=lambda game: game['latestUpdate'], reverse=True)
#
#    # Get the top 10 games
#    tenGamesList = latestGames[:10]
#    tenGamesListFininshed = latestGamesFinished[:10]
#
#    # Serialize the games into JSON
#    tenGamesJSON = [SF_fastSerializeGame(game, request.user) for game in tenGamesList]
#    tenGamesFinishedJSON = [
#        SF_fastSerializeGame(game, request.user) for game in tenGamesListFininshed
#    ]
#
#    # 4. JSON Data Loading (Optimized file reading)
#    def load_stat_json(path):
#        try:
#            with open(path, "r") as f:
#                return json.load(f)
#        except FileNotFoundError:
#            return []
#
#    base_path = "./Lobby/stats/"
#
#    # Fair Play
#    fairPlayArr = load_stat_json(f"{base_path}fairPlayArr_E.json")
#
#    # Win Arrays (Batch loading)
#    win_data = {
#        "winArr": load_stat_json(f"{base_path}winArr_E.json"),
#        "win3mArr": load_stat_json(f"{base_path}win3mArr_E.json"),
#        "win1mArr": load_stat_json(f"{base_path}win1mArr_E.json"),
#    }
#
#    # Player-specific Win Arrays
#    p_counts = [2, 3, 4, 5, 6]
#    p_stats = {}
#    for p in p_counts:
#        p_stats[f"winArr{p}p"] = load_stat_json(f"{base_path}winArr{p}p_E.json")
#        p_stats[f"win3mArr{p}p"] = load_stat_json(f"{base_path}win3mArr{p}p_E.json")
#        p_stats[f"win1mArr{p}p"] = load_stat_json(f"{base_path}win1mArr{p}p_E.json")
#
#    games = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB"]  # , "RNB"]
#
#    return render(
#        request,
#        "Lobby/stats.html",
#        {
#            "totalUsers": totalUsers,
#            "game_stats": game_stats,
#            "totalGames": totalGames,
#            "finishedGames": finishedGames,
#            "tenGames": tenGamesJSON,
#            "tenGamesFinished": tenGamesFinishedJSON,
#            "userActvitiy": userActvitiy,
#            "games": games,
#            # Fair Play
#            "fairPlayArr": fairPlayArr,
#            **win_data,
#            **p_stats,
#        },
#    )


@login_required
def stats(request):
    # 1. Global Stats (Cached)
    stats_data = cache.get("global_stats")
    if not stats_data:
        date_from = timezone.now() - timezone.timedelta(hours=24)
        stats_data = {
            "totalUsers": User.objects.count(),
            "userActivity": UserVisit.objects.filter(timestamp__gte=date_from).aggregate(total=Count("user_id", distinct=True))["total"],
        }
        cache.set("global_stats", stats_data, 300)

    # Variables are now correctly unpacked regardless of cache hit/miss
    totalUsers = stats_data["totalUsers"]
    userActivity = stats_data["userActivity"]

    # 2. Optimized ID exclusion (Avoids expensive NOT EXISTS subqueries)
    excluded_game_ids = GamePlayer.objects.filter(player__username__in=rf.SHADOW_USERNAMES).values_list("game_id", flat=True)

    # 3. Batch Fetch ALL Counts (1 Query instead of 18)
    game_codes = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

    all_counts = (
        Game.objects.filter(gameCode__in=game_codes)
        .exclude(id__in=excluded_game_ids)
        .values("gameCode")
        .annotate(
            active_count=Count("id", filter=Q(gameStatus="ACTIVE")),
            finished_count=Count("id", filter=Q(gameStatus="FINISHED")),
        )
    )

    counts_map = {item["gameCode"]: item for item in all_counts}

    # 4. Batch Fetch Latest Games (2 Queries instead of 18)
    # We fetch a larger slice and sort/slice in Python to minimize DB hits
    raw_latest_active = Game.objects.filter(gameCode__in=game_codes, gameStatus="ACTIVE").exclude(id__in=excluded_game_ids).select_related("creator").order_by("-latestUpdate")[:50]

    raw_latest_finished = Game.objects.filter(gameCode__in=game_codes, gameStatus="FINISHED").exclude(id__in=excluded_game_ids).select_related("creator").order_by("-latestUpdate")[:50]

    # 5. Build the Game Stats List
    GAME_META = {
        "FCM": {"name": "Food Chain Magnate", "gameCode": "FCM"},
        "HLC": {"name": "Horseless Carriage", "gameCode": "HLC"},
        "BUS": {"name": "Bus", "gameCode": "BUS"},
        "TGZ": {"name": "The Great Zimbabwe", "gameCode": "TGZ"},
        "CNS": {"name": "CNS", "gameCode": "CNS"},
        "AQY": {"name": "Antiquity", "gameCode": "AQY"},
        "IND": {"name": "Indonesia", "gameCode": "IND"},
        "KFW": {"name": "KFW", "gameCode": "KFW"},
        "WEB": {"name": "WEB", "gameCode": "WEB"},
    }

    game_stats = []
    for code in game_codes:
        c = counts_map.get(code, {"active_count": 0, "finished_count": 0})
        meta = GAME_META.get(code, {"name": code, "gameCode": code})
        game_stats.append({**meta, "active": c["active_count"], "finished": c["finished_count"]})

    # Calculate grand totals from the aggregated data
    totalGames = sum(g["active"] for g in game_stats)
    finishedGames = sum(g["finished"] for g in game_stats)

    # Serialize only the top 10 from our prefetched list
    tenGamesJSON = [SF_fastSerializeGame(g, request.user) for g in raw_latest_active[:10]]
    tenGamesFinishedJSON = [SF_fastSerializeGame(g, request.user) for g in raw_latest_finished[:10]]

    # 6. JSON Data Loading (Files)
    def load_stat_json(path):
        try:
            with open(path) as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    base_path = "./Lobby/stats/"
    fairPlayArr = load_stat_json(f"{base_path}fairPlayArr_E.json")

    win_data = {
        "winArr": load_stat_json(f"{base_path}winArr_E.json"),
        "win3mArr": load_stat_json(f"{base_path}win3mArr_E.json"),
        "win1mArr": load_stat_json(f"{base_path}win1mArr_E.json"),
    }

    p_stats = {}
    for p in [2, 3, 4, 5, 6]:
        p_stats[f"winArr{p}p"] = load_stat_json(f"{base_path}winArr{p}p_E.json")
        p_stats[f"win3mArr{p}p"] = load_stat_json(f"{base_path}win3mArr{p}p_E.json")
        p_stats[f"win1mArr{p}p"] = load_stat_json(f"{base_path}win1mArr{p}p_E.json")

    return render(
        request,
        "Lobby/stats.html",
        {
            "totalUsers": totalUsers,
            "userActvitiy": userActivity,  # Fixed typo from 'userActvitiy'
            "game_stats": game_stats,
            "totalGames": totalGames,
            "finishedGames": finishedGames,
            "tenGames": tenGamesJSON,
            "tenGamesFinished": tenGamesFinishedJSON,
            "games": game_codes,
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

    # start_time = time.time()

    # def print_timestamp(label):
    #    if show_timestamps:
    #        print(
    #            f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}"
    #        )

    list_type = request.session.pop("listType", "current")

    # --- Step 1: Optimized Blacklist (2 Queries total) ---
    profile = request.user.profile
    blacklisted_players_ids = set(profile.blacklistedPlayers.values_list("id", flat=True))

    # Who blocked me?
    blocked_by_user_ids = set(Profile.objects.filter(blacklistedPlayers=request.user).values_list("user_id", flat=True))

    # print_timestamp("Step 1: Blacklists fetched")

    # OLD STEP 2
    #    # --- Step 2: Deep Prefetching (Essential for Step 3) ---
    #    all_user_games = []
    #
    #    from django.db.models import Exists, OuterRef
    #
    #    # For Game model, check through GamePlayer
    #    is_player = Game.objects.filter(id=OuterRef("id"), players__player=user).values(
    #        "id"
    #    )
    #
    #    is_invited = Game.objects.filter(id=OuterRef("id"), invitedPlayers=user).values(
    #        "id"
    #    )
    #
    #    games_query = Game.objects.annotate(
    #        user_is_player=Exists(is_player), user_is_invited=Exists(is_invited)
    #    ).filter(
    #        Q(user_is_player=True)
    #        | Q(user_is_invited=True)
    #        | Q(gameStatus="AVAILABLE", created__gte=recent_cutoff)
    #    )
    #
    #    # Defer large fields
    #    games_query = games_query.defer(
    #        "gameData",
    #        "rewindData",
    #        "rewindTempData",
    #        "chatData",
    #    )
    #
    #    # Prefetch related data
    #    games_query = games_query.select_related("creator").prefetch_related(
    #        "players__player", "invitedPlayers"
    #    )

    player_game_ids = GamePlayer.objects.filter(player=user).values_list("game_id", flat=True)
    invited_game_ids = Game.invitedPlayers.through.objects.filter(user=user).values_list("game_id", flat=True)

    # 2. Combine these IDs with the 'AVAILABLE' criteria in a single clean 'IN' clause
    # This avoids the messy JOIN logic in the main query
    games_query = (
        Game.objects.filter(Q(id__in=player_game_ids) | Q(id__in=invited_game_ids) | Q(gameStatus="AVAILABLE", created__gte=recent_cutoff))
        .distinct()
        .select_related("creator")
        .prefetch_related(
            Prefetch(
                "players",
                queryset=GamePlayer.objects.select_related("player"),
                to_attr="prefetched_players",
            ),
            "invitedPlayers",
        )
        .defer("gameData", "rewindData", "rewindTempData", "chatData")
    )

    all_user_games = list(games_query)

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

        #        # Blacklist check (already optimized)
        #        if (
        #            game.creator_id in blacklisted_players_ids
        #            or game.creator_id in blocked_by_user_ids
        #        ):
        #            # We still allow involved games even if blacklisted
        #            is_blacklisted_game = True
        #        else:
        #            is_blacklisted_game = False
        #
        #        # Access prefetched data
        #        all_game_players = game.players.exclude(is_kicked=True).all()
        #        all_p_ids = {gp.player.id for gp in all_game_players if gp.player}
        #        inv_p_ids = {p.id for p in game.invitedPlayers.all()}
        #        miss_p_ids = {
        #            gp.player.id for gp in all_game_players if gp.is_missing and gp.player
        #        }
        #
        #        is_involved = user_id in all_p_ids
        #        is_invited = user_id in inv_p_ids
        #
        #        # 2. Only serialize if the game meets our visibility criteria
        #        # This saves CPU cycles on games the user won't see

        # Use the cached '.prefetched_players' list from our Prefetch object
        all_game_players = game.prefetched_players
        active_players = [gp for gp in all_game_players if not gp.is_missing]
        all_active_p_ids = {gp.player_id for gp in active_players}
        all_p_ids = {gp.player_id for gp in all_game_players if gp.player_id}

        inv_p_ids = {p.id for p in game.invitedPlayers.all()}
        # miss_p_ids = {gp.player_id for gp in all_game_players if gp.is_missing}
        user_gp = next((gp for gp in all_game_players if gp.player_id == user_id), None)
        is_pending_finish = bool(user_gp and user_gp.is_pending_finish)

        is_involved = user_id in all_p_ids
        is_invited = user_id in inv_p_ids
        is_active = user_id in all_active_p_ids
        is_blacklisted_game = game.creator_id in blacklisted_players_ids or game.creator_id in blocked_by_user_ids

        player_context = {
            "all_game_players": all_game_players,
            "invited_users": list(game.invitedPlayers.all()),
        }

        try:
            serialized = SF_serializeGame(game, user, player_context)
        except Game.DoesNotExist:
            SN_sendAdminErrorMessage(f"Game {game.getGameCode() if hasattr(game, 'getGameCode') else game.gameCode} {game.id} does not exist - trying to serialize in lobby")
            continue

        if is_involved:
            if status == "ACTIVE" and is_active:
                current_games.append(serialized)
                if serialized["myMove"]:
                    my_move_games_data.append([serialized["gameCode"], serialized["gameID"]])
                if serialized["chatNotification"]:
                    current_chat = True
            elif status in ["WAITING", "AVAILABLE", "PRIVATE"]:
                waiting_games.append(serialized)
            elif status == "FINISHED":
                if is_pending_finish:
                    current_games.append(serialized)
                    if serialized["chatNotification"]:
                        current_chat = True
                elif len(finished_games) < 10:
                    finished_games.append(serialized)
                    if serialized["chatNotification"]:
                        finished_chat = True

        elif not is_blacklisted_game and status == "AVAILABLE":
            available_games.append(serialized)

        elif is_invited and status in ["WAITING", "PRIVATE"]:
            invitations_games.append(serialized)

    # print_timestamp("Step 3: Categorization complete")

    current_games = sorted(
        current_games,
        key=lambda game: (
            0 if game["pendingFinish"] else (1 if game["myMove"] else 2),
            -int(game["latestUpdate"]),
        ),
    )

    # --- Step 4: Mini Tournaments (Use select_related to save hits) ---
    # Combine these or use more prefetching if serialize() hits related objects
    available_MT_qs = Tournament.objects.filter(tournamentStatus="OP", tournamentCategory="Mini").select_related("creator").order_by("-created")
    available_MT = [item.serialize() for item in available_MT_qs]

    current_MT_qs = Tournament.objects.filter(tournamentStatus="IP", tournamentCategory="Mini", startingPlayers=user).select_related("creator")
    current_MT = [item.serialize() for item in current_MT_qs]

    # print_timestamp("Step 4: MT fetched")

    # --- Step 5: Caching Tournament Availability ---
    cache_key = "lobby_main_tournaments_check"
    available_tournaments = cache.get(cache_key)
    if available_tournaments is None:
        main_tours = list(Tournament.objects.filter(tournamentStatus="OP", tournamentCategory="Main").values_list("gameCode", flat=True))
        available_tournaments = list(set(main_tours))
        cache.set(cache_key, available_tournaments, 60)  # Cache for 1 minute

    # print_timestamp("Final prep complete")

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


def login_view(request):
    if request.method == "POST":
        # Attempt to sign user in
        # 1. SAFE DATA EXTRACTION
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")

        # 2. VALIDATION: If these are missing, don't even try to authenticate
        if not username or not password:
            # Gather all metadata
            debug_info = {
                "IP": request.META.get("REMOTE_ADDR"),
                "UA": request.META.get("HTTP_USER_AGENT"),
                "Path": request.path,
                "Method": request.method,
                "Content_Type": request.headers.get("Content-Type"),
                "POST_Keys": list(request.POST.keys()),
            }

            # Try to peek at the raw body in case it's JSON
            try:
                body_sample = request.body.decode("utf-8")[:500]
                debug_info["Raw_Body_Sample"] = body_sample
            except (UnicodeDecodeError, AttributeError):
                debug_info["Raw_Body_Status"] = "Not decodable"

            formatted_data = json.dumps(debug_info, indent=2)
            # Discord has a 2000 character limit, so we truncate if needed
            content = f"**!!! LOGIN ATTEMPT: Missing Fields !!!**\n```json\n{formatted_data[:1800]}\n```"

            # Send to Discord
            SN_sendAdminErrorMessage(content)

            messages.error(request, gettext("Username and password are required."))
            return render(request, "Lobby/login.html")

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
                logger.warning(f"{user.username}: Possible redirect to unsafe URL: {nxt}")  # Log the potentially unsafe redirect
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
                        (gettext("Account inactive - check your email for email verification, or contact the webmaster")),
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
                        gettext("Invalid username / password. Please use your username, not your email address."),
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
        return render(request, "Lobby/FCMmapEditor.html", {"mapData": request.POST["mapData"]})

    else:
        return render(request, "Lobby/FCMmapEditor.html")


@login_required
def TGZmapEditor(request):
    if request.method == "POST":
        return render(request, "Lobby/TGZmapEditor.html", {"mapData": request.POST["mapDataTGZ"]})

    else:
        isSchismUser = False
        ALLOWED_SCHISM_USERS = ["admin", "joshuastarr", "Lemem", "waymost"]
        if request.user.username in ALLOWED_SCHISM_USERS:
            isSchismUser = True
        return render(request, "Lobby/TGZmapEditor.html", {"isSchismUser": isSchismUser})


@login_required
def AQYmapEditor(request):
    if request.method == "POST":
        return render(request, "Lobby/AQYmapEditor.html", {"mapData": request.POST["mapDataAQY"]})

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
                for _field, errors in form.errors.items():
                    for error in errors:
                        if isinstance(error, str):
                            error_messages.append(error)
                        else:
                            error_messages.append(str(error))  # Convert to string if it's not already

                error_string = " ".join(error_messages)
                messages.error(request, error_string)
                return redirect("profile")
        elif request.POST["action"] == "updateProfileFavourites":
            profile = Profile.objects.get(user=request.user)
            profile.preferredRestaurantColour = request.POST["fcmResto"]
            profile.preferredHCcolour = request.POST["hcColour"]
            profile.highContrastBoardItems = "highContrastBoardItems" in request.POST

            profile.preferredBusColour = request.POST["busColour"]
            profile.preferredBusBoard = request.POST["BusBoard"]

            profile.preferredTGZcolour = request.POST["tgzColour"]
            profile.TGZminimalText = "TGZminimalText" in request.POST

            preferredCNScolour = request.POST["cnsColour"] if request.POST["cnsColour"] != "-1" else None
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

            profile.sendEmailNotificationOnTurn = "sendEmails" in request.POST

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
            profile.emailNotifications = json.dumps(emailNotifications, separators=(",", ":"))

            profile.save()

            submission_source = request.POST.get("submissionSource", "")

            if submission_source == "webhookTest":
                messages.success(
                    request,
                    gettext("A test message has been sent and your notification preferences have been updated successfully"),
                )
            else:
                messages.success(
                    request,
                    gettext("Your notification preferences have been updated successfully"),
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
        favHLCcolour = profile.preferredHCcolour
        if favHLCcolour == "":
            favHLCcolour = -1
        highContrastBoardItems = profile.highContrastBoardItems

        preferredCNScolour = profile.preferredCNScolour if profile.preferredCNScolour is not None else -1

        preferredKFWoptions = json.loads(profile.preferredKFWoptions) if profile.preferredKFWoptions != "" and profile.preferredKFWoptions is not None else [-1]
        favKFWcolour = preferredKFWoptions[0]

        preferredWEBoptions = json.loads(profile.preferredWEBoptions) if profile.preferredWEBoptions != "" and profile.preferredWEBoptions is not None else [-1]
        favWEBcolour = preferredWEBoptions[0]

        sendEmails = profile.sendEmailNotificationOnTurn

        liveNotification = profile.liveNotification

        passwordResetForm = PasswordChangeCustomForm(request.user)

        webhooks = json.loads(profile.webhooks) if profile.webhooks != "" and profile.webhooks is not None else []
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

        blacklisted_players = [player.username.strip() for player in profile.blacklistedPlayers.all()]

        return render(
            request,
            "Lobby/profile.html",
            {
                "form": profile_form,
                "form2": passwordResetForm,
                "favColour": favColour,
                "favHLCcolour": favHLCcolour,
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
                "discord_client_id": config("DISCORD_CLIENT_ID"),
                "discord_id": profile.discord_id,
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
        preferredAQYoptions = json.loads(request.user.profile.preferredAQYoptions) if request.user.profile.preferredAQYoptions != "" else [-1, 1, 0, 0, 1, 1, 0]

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
        INDoptions.append(int(request.POST.get("indColour", -1)))
        INDoptions.append(int(request.POST.get("mapType", 0)))
        INDoptions.append(int(request.POST.get("citySizeColour", 0)))
        INDoptions.append(int(request.POST.get("indOutline", 1)))
        INDoptions.append(int(request.POST.get("goodsIcon", 1)))
        INDoptions.append(int(request.POST.get("shipIcon", 1)))
        INDoptions.append(int(request.POST.get("playerTableStyle", 0)))

        profile.preferredINDoptions = json.dumps(INDoptions, separators=(",", ":"))

        profile.save()

        messages.success(
            request,
            gettext("Your Indonesia preferences have been updated successfully"),
        )
        return redirect(to="profileIND")

    else:
        profile = Profile.objects.get(user=request.user)
        preferredINDoptions = json.loads(request.user.profile.preferredINDoptions) if request.user.profile.preferredINDoptions != "" else [-1, 0, 0, 1, 1, 1, 0]

        if len(preferredINDoptions) < 7:
            preferredINDoptions.extend([0] * (7 - len(preferredINDoptions)))
            preferredINDoptions[6] = 0
        # Option 4 (goods icon) must be 1 or 2, for the edition. Check it hasn't slipped to 0.
        if preferredINDoptions[4] == 0:
            preferredINDoptions[4] = 1
        # [colour, mapType, citySizeColour, indOutline, goodsIcon, shipIcon, playerTableStyle]

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
                "playerTableStyle": preferredINDoptions[6],
            },
        )


@login_required
def profileRNB(request):
    if request.method == "POST":
        profile = Profile.objects.get(user=request.user)

        RNBoptions = []
        RNBoptions.append(int(request.POST.get("rnbColour", -1)))
        RNBoptions.append(int(request.POST.get("playerAid", 1)))

        profile.preferredRNBoptions = json.dumps(RNBoptions, separators=(",", ":"))

        profile.save()

        messages.success(
            request,
            gettext("Your RNB preferences have been updated successfully"),
        )
        return redirect(to="profileRNB")

    else:
        profile = Profile.objects.get(user=request.user)
        preferredRNBoptions = json.loads(request.user.profile.preferredRNBoptions) if request.user.profile.preferredRNBoptions != "" else [-1]

        if len(preferredRNBoptions) < 2:
            preferredRNBoptions.extend([-1] * (2 - len(preferredRNBoptions)))

        # Check the default for playerAid
        if preferredRNBoptions[1] == -1:
            preferredRNBoptions[1] = 1

        return render(
            request,
            "Lobby/profileRNB.html",
            {
                "colour": preferredRNBoptions[0],
                "playerAid": preferredRNBoptions[1],
            },
        )


@login_required
def createBUSpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "BUS", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createBUS.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="BUS")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        playerNames = []
        for gp in currentGame.players.exclude(is_kicked=True).select_related("player"):
            if request.user != gp.player and gp.player:
                playerNames.append(gp.player.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createBUS.html",
            {
                "fillData": True,
                "gameName": currentGame.presenter().getGameName(),
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
            currentGame = Game.objects.get(id=gameID, gameCode="CNS")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
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
    experienced = SF_hasRequiredExperience(request, "AQY", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createAQY.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID)
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
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
                "startingMap": json.loads(currentGame.startingMap) if currentGame.startingMap else {},
                "mapData": json.loads(currentGame.startingMap) if currentGame.startingMap else {},
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
    experienced = SF_hasRequiredExperience(request, "IND", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createIND.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="IND")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
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
def createINDpage2(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "IND", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createIND2.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="IND")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        # Get players from GamePlayer relationship
        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        return render(
            request,
            "Lobby/createIND2.html",
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
    experienced = SF_hasRequiredExperience(request, "KFW", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createKFW.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="KFW")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        playerNames = []
        for gp in currentGame.players.exclude(is_kicked=True).select_related("player"):
            if gp.player and request.user != gp.player:
                playerNames.append(gp.player.username)

        messages.success(request, (gettext("Game creation for rematch")))
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
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
            currentGame = Game.objects.get(id=gameID, gameCode="WEB")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None
        # presenter = currentGame.presenter()
        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createWEB.html",
            {
                "fillData": True,
                "gameName": currentGame.presenter().getGameName(),
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
def createRNBpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "RNB", Game)
    # Get settings debug flag for RNB map rendering
    settings_debug = config("RNB_USE_SOURCE_CODE", default=False, cast=bool)

    # Handle query parameters for solo map play
    if request.method != "POST" and gameID == 0:
        context = {"experienced": experienced, "settingsDebug": settings_debug}

        # Check for map and players query parameters
        map_id = request.GET.get("map")
        players = request.GET.get("players")

        if map_id and players == "1":
            # Set up for solo play with selected map
            context.update(
                {
                    "fillData": True,
                    "gamePace": 30,  # Default pace
                    "playerNumber": 1,  # Solo play
                    "playerNames": [],  # No additional players
                    "kickoutDuration": 100,  # Default kickout duration
                    "startingOptions": [],  # No special starting options
                    "selectedMapId": map_id,  # Pass uniqueID for matching
                }
            )

        return render(request, "Lobby/createRNB.html", context)
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="RNB")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None
        # presenter = currentGame.presenter()
        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createRNB.html",
            {
                "fillData": True,
                "gameName": currentGame.presenter().getGameName(),
                "gameDescription": currentGame.gameDescription,
                "gamePace": currentGame.gamePace,
                "playerNumber": currentGame.maxPlayers,
                "playerNames": playerNames,
                "kickoutDuration": currentGame.kickoutDuration,
                "startingOptions": loadedStartingOptions,
                "experienced": experienced,
                "settingsDebug": settings_debug,
            },
        )

    return HttpResponse(status=204)  # No Content


@login_required
def createTGZpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "TGZ", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createTGZ.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID)
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        all_players = currentGame.players.exclude(player=request.user).select_related("player")
        playerNames = [gp.player.username for gp in all_players if gp.player]

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
                "startingMap": json.loads(currentGame.startingMap) if currentGame.startingMap else [],
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
        currentGame = Game.objects.get(id=gameID)
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    return render(
        request,
        "Lobby/showTGZoptions.html",
        {
            "gameName": currentGame.gameName,
            "gameDescription": currentGame.gameDescription,
            "godsVRhtml": SR_getgodsVRoptionsHTML(json.loads(currentGame.startingOptions) if currentGame.startingOptions else []),
        },
    )


@login_required
def createHLCpage(request, gameID=0):
    experienced = SF_hasRequiredExperience(request, "HLC", Game)
    if request.method != "POST" and gameID == 0:
        return render(request, "Lobby/createHLC.html", {"experienced": experienced})
    elif request.method != "POST" and gameID != 0:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="HLC")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        playerNames = []
        for gp in currentGame.players.all().select_related("player"):
            if gp.player and request.user != gp.player:
                playerNames.append(gp.player.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createHLC.html",
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
    experienced = SF_hasRequiredExperience(request, "FCM", Game)

    if request.method != "POST" and gameID is None:
        return render(request, "Lobby/createFCM.html", {"experienced": experienced})
    elif request.method != "POST" and gameID is not None:
        # Extract the data from gameID and return template with all data
        try:
            currentGame = Game.objects.get(id=gameID, gameCode="FCM")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

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
        for gp in currentGame.players.all().select_related("player"):
            if gp.player and request.user != gp.player:
                playerNames.append(gp.player.username)

        messages.success(request, (gettext("Game creation for rematch")))
        return render(
            request,
            "Lobby/createFCM.html",
            {
                "fillData": True,
                "gameName": currentGame.presenter().getGameName(),
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
                    config("OBG_EMAIL_HOST_USER"),
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                adminMessage = f"Failed to send activation email to username: {user.username} and email {user.email}: {str(e)}"
                print("****************************************************************************** EMAIL SIGNUP ERROR **************")
                SN_sendAdminErrorMessage(adminMessage)
                return HttpResponse("Invalid header found.")
            message = gettext("Please check %(emailAddress)s to confirm your email address and complete registration") % {"emailAddress": user.email}
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
            profile = user.profile
            profile.email_confirmed = True
            profile.save()
            user.save()
            login(request, user)
            messages.success(
                request,
                mark_safe(gettext("Your account has been activated<br/>Enable Email, Discord, and Slack notifications here on your profile, and then return to the Home Page to view games")),
            )
            return redirect("profile")
        else:
            messages.warning(
                request,
                (gettext("The confirmation link was invalid, possibly because it has already been used. If you think your email client scanned the link, then try to log in anyway")),
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
        return HttpResponse(gettext("Thank you for your email confirmation. Now you can login to your account"))
    else:
        return HttpResponse(gettext("Activation link is invalid"))


@login_required
def playerInfo(request, usernameToProfile):
    try:
        userToProfile = User.objects.select_related("profile").get(username=usernameToProfile)
    except User.DoesNotExist:
        messages.error(request, gettext("Player does not exist"))
        return render(request, "Lobby/playerInfo.html")

    profileOfUser = userToProfile.profile
    FCMtournamentTrophies = json.loads(profileOfUser.FCMtournamentTrophies)

    trophyHTML = ""
    trophyDetailHTML = ""

    # Game names and image URLs
    game_names = {
        1: "FCM",
        2: "HLC",
        3: "BUS",
        4: "TGZ",
        5: "AQY",
        6: "IND",
        7: "KFW",
        8: "WEB",
    }
    image_urls = {
        1: "/static/FCM/images/burger_board.png",
        2: "/static/HLC/images/icon_car.png",
        3: "/static/BUS/images/bus_icon.png",
        4: "/static/TGZ/images/tgz_icon.png",
        5: "/static/AQY/images/aqy_icon.png",
        6: "/static/IND/images/ind_icon.png",
        7: "/static/KFW/images/kfw_icon.png",
        8: "/static/WEB/images/web_icon.png",
    }

    if len(FCMtournamentTrophies) > 1:
        totals = [sum(col) for col in zip(*FCMtournamentTrophies[1:], strict=True)]

        medal_names = ["gold", "silver", "bronze"]
        medal_images = [
            "/static/Lobby/images/trophy_gold.png",
            "/static/Lobby/images/trophy_silver.png",
            "/static/Lobby/images/trophy_bronze.png",
        ]

        for total, _medal_name, medal_image in zip(totals, medal_names, medal_images, strict=True):
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

    target_id = userToProfile.id
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
    minus1year = int((datetime.datetime.now() - datetime.timedelta(days=365)).timestamp() * 1000)

    all_games = []

    # THE MASTER LOOP: One model at a time
    # for game_name, game_model in GAME_NAMES_MODELS.items():
    #    all_games = list(
    #        Game.objects.filter(gameCode=game_name, players__player_id=target_id)
    #        .select_related("creator")
    #        .prefetch_related(
    #            Prefetch(
    #                "players",
    #                queryset=GamePlayer.objects.select_related("player"),
    #                to_attr="prefetched_players",
    #            ),
    #            "invitedPlayers",
    #        )
    #        .distinct()
    #    )

    all_games = list(
        Game.objects.filter(players__player_id=target_id, gameCode__in=GAME_NAMES_MODELS.keys())
        .select_related("creator")
        .prefetch_related(
            Prefetch(
                "players",
                queryset=GamePlayer.objects.select_related("player"),
                to_attr="prefetched_players",
            ),
            "invitedPlayers",
        )
        .distinct()
    )

    games_by_type = {}
    for game in all_games:
        if game.gameCode not in games_by_type:
            games_by_type[game.gameCode] = []
        games_by_type[game.gameCode].append(game)

    # Now process each game type with its games
    for game_name in GAME_NAMES_MODELS:
        all_games_for_type = games_by_type.get(game_name, [])

        # Model-specific counters for the stats table
        model_joint_finished = 0
        model_joint_wins = 0

        # Stats by player count: {player_count: [total, won]}
        stats_by_size = {i: [0, 0] for i in range(2, 7)}
        model_total_finished = 0
        model_total_won = 0

        target_user_player_ids = set()  # Track all game player IDs for this user

        for game in all_games_for_type:
            status = game.gameStatus
            all_game_players = game.prefetched_players

            # OPTIMIZATION: Pre-calc common data
            game_player_ids = {gp.player.id for gp in all_game_players if gp.player}
            target_user_player_ids.update(game_player_ids)

            # Joint game = both admin (req_user_id) AND target user (target_id) are in the same game
            is_joint = target_id in game_player_ids and req_user_id in game_player_ids

            # Pre-calc winner IDs once
            winner_ids = {gp.player.id for gp in all_game_players if gp.player and gp.winner}

            # Pre-calc shadow check
            shadow_user_id = None
            for gp in all_game_players:
                if gp.player and gp.player.username == "SHADOW":
                    shadow_user_id = gp.player.id
                    break

            has_shadow = shadow_user_id is not None

            # Pre-calc kickout check
            is_kicked = False
            for gp in all_game_players:
                if gp.player and gp.player.id == target_id and gp.is_kicked:
                    is_kicked = True
                    break

            if status == "FINISHED":
                # General Stats Logic
                # has_shadow = any(
                #    gp.player.username == "SHADOW"
                #    for gp in all_game_players
                #    if gp.player
                # )

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
                    # if any(
                    #    gp.player.id == target_id and gp.is_kicked
                    #    if gp.player
                    #    else False
                    #    for gp in all_game_players
                    # ):
                    if is_kicked:
                        kickedOutGamesLastYear += 1

            # --- Categorization for Lists ---
            if status == "ACTIVE":
                serialized_game = SF_serializeGame(
                    game,
                    request.user,
                    {
                        "all_game_players": game.prefetched_players,
                        "invited_users": [],
                    },
                )
                if is_joint and not is_self:
                    activeJoint.append(serialized_game)
                else:
                    activeOther.append(serialized_game)
            elif status == "FINISHED":
                serialized_game = SF_serializeGame(
                    game,
                    request.user,
                    {
                        "all_game_players": game.prefetched_players,
                        "invited_users": [],
                    },
                )
                if is_joint and not is_self:
                    finishedJoint.append(serialized_game)
                else:
                    finishedOther.append(serialized_game)

        # Step 2: Post-Model Processing (Joint)
        if not is_self and model_joint_finished > 0:
            win_pct = str(round((model_joint_wins / model_joint_finished) * 100))
            jointGameStats.append([game_name, model_joint_wins, model_joint_finished, win_pct])
            total_finished_joint += model_joint_finished
            total_wins_joint += model_joint_wins

        # Step 3: Post-Model Processing (General Stats Table)
        gameArr = []
        for i in range(2, 7):
            total, won = stats_by_size[i]
            pct = int(won / total * 100) if total > 0 else 0
            gameArr.extend([total, won, pct])

        all_pct = int(model_total_won / model_total_finished * 100) if model_total_finished > 0 else 0
        gameArr.extend([model_total_finished, model_total_won, all_pct])
        allGamesArr.append(gameArr)

    # Final calculations
    jointWinTotal = str(total_wins_joint)
    jointWinPercentage = str(round((total_wins_joint / total_finished_joint) * 100)) if total_finished_joint > 0 else "0"

    fairPlayLastYear = 100
    if finishedGamesLastYear > 0:
        # Subtract 1 from kickouts as per your logic
        adj_kicked = max(0, kickedOutGamesLastYear - 1)
        fairPlayLastYear = int((finishedGamesLastYear - adj_kicked) / finishedGamesLastYear * 100)

    active_joint_sorted = sorted(activeJoint, key=lambda x: x["latestUpdate"], reverse=True)
    active_other_sorted = sorted(activeOther, key=lambda x: x["latestUpdate"], reverse=True)
    finished_joint_sorted = sorted(finishedJoint, key=lambda x: x["latestUpdate"], reverse=True)
    finished_other_sorted = sorted(finishedOther, key=lambda x: x["latestUpdate"], reverse=True)

    response = render(
        request,
        "Lobby/playerInfo.html",
        {
            "trophyHTML": trophyHTML,
            "trophyDetailHTML": trophyDetailHTML,
            "activeJointGames": active_joint_sorted,
            "activeOtherGames": active_other_sorted,
            "finishedJointGames": finished_joint_sorted,
            "finishedOtherGames": finished_other_sorted,
            "usernameToProfile": usernameToProfile,
            "kickedOutGamesLastYear": kickedOutGamesLastYear,
            "fairPlayLastYear": fairPlayLastYear,
            "games": GAME_NAMES_MODELS,
            "allGamesArr": allGamesArr,
            "jointWinTotal": jointWinTotal,
            "jointWinPercentage": jointWinPercentage,
            "jointGameStats": jointGameStats,
        },
        # using="jinja2",
    )

    return response


@login_required()
def AllTournaments(request):
    tournaments_MAIN = Tournament.objects.filter(tournamentCategory="Main").exclude(tournamentStatus=PENDING).order_by("-id").all()

    tournaments = sorted(
        tournaments_MAIN,
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


@login_required
def joinGameLink(request, joinGameLink):
    gameCode = None
    numbers = None

    match = re.match(r"([A-Za-z]{2,3})(\d+)$", joinGameLink)

    # CHECK FOR gameCode/NUMBERS
    if match:
        gameCode = match.group(1)
        # letters = gameCode.upper()
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
        availableGame = Game.objects.get(id=numbers, gameCode=gameCode)
    except Game.DoesNotExist:
        messages.error(request, (gettext("Sorry, the game no longer exists")))
        return HttpResponseRedirect(reverse("index"))

    current_player_count = availableGame.players.exclude(is_kicked=True).count()

    if current_player_count >= availableGame.maxPlayers:
        messages.error(request, (gettext("Sorry, the game is full")))
        return HttpResponseRedirect(reverse("index"))

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

    try:
        currentGame = Game.objects.prefetch_related("players__player", "invitedPlayers").get(id=jsonData["gameID"], gameCode=gameType)
    except Game.DoesNotExist:
        messages.error(request, (gettext("Sorry, the game no longer exists")))
        return JsonResponse({"listToShow": "AVAILABLE"}, safe=False)

    action = jsonData.get("action", "")
    current_players_list = [gp.player for gp in currentGame.players.exclude(is_kicked=True) if gp.player]

    # Delete Training Game // Can never really fail
    if currentGame and action == "deleteTrgGame":
        if request.user == currentGame.creator:
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
            currentGame.players.filter(player=request.user).delete()

            # Using len() on the prefetched list minus the one we removed
            if len(current_players_list) <= 1:
                currentGame.delete()
                messages.success(request, (gettext("You have left the game - it has been deleted")))
            else:
                currentGame.save()
                messages.success(
                    request,
                    (gettext("You have left the game - it is available for players to join")),
                )

        print(f"DB hits: {len(connection.queries)}")

        return JsonResponse(["AVAILABLE"], safe=False)

    elif currentGame and action == "decline":
        currentGame.invitedPlayers.remove(request.user)
        if currentGame.invitedPlayers.count() == 0:
            if currentGame.gameStatus == "WAITING":
                messages.success(
                    request,
                    (gettext("You have declined the invitation - it is available for players to join")),
                )
                currentGame.gameStatus = "AVAILABLE"
            elif currentGame.gameStatus == "PRIVATE":
                messages.success(request, (gettext("You have declined the invitation")))
        else:
            messages.success(
                request,
                (gettext("You have declined the invitation - the game is waiting for other invitees to respond")),
            )

        # Send an email to the creator, telling them who has declined and why
        reason = jsonData.get("reason", "None Given")

        from django_q.tasks import async_task

        async_task(
            "Lobby.sharedFunctions.sharedNotifications.SN_sendDeclineEmail",
            request.user.username,
            currentGame.creator.username,
            currentGame.gameCode,
            currentGame.presenter().getGameName,
            currentGame.gameDescription,
            reason,
        )

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

    # CHECK VALID gameType
    if gameType not in GAME_NAMES_MODELS:
        messages.error(request, (gettext("Invalid Game Join Link")))
        if ajaxReturn:
            return JsonResponse(
                {
                    "listToShow": "AVAILABLE",
                }
            )
        return

    # CHECK GAME EXISTS
    try:
        currentGame = Game.objects.prefetch_related(
            "invitedPlayers",
            "players__player",
            "creator__profile__blacklistedPlayers",
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

    all_players_list = [gp.player for gp in currentGame.players.exclude(is_kicked=True) if gp.player]
    invited_players_list = list(currentGame.invitedPlayers.all())

    # Check that if the game is WAITING, you are in the invites, OR there is a blank space
    if currentGame.gameStatus == "WAITING" and request.user not in invited_players_list and (len(invited_players_list) + len(all_players_list)) >= currentGame.maxPlayers:
        messages.error(
            request,
            (gettext("The host set the usernames of players allowed to join. Unfortunately, you are not allowed to join this game")),
        )
        errorFound = True

    # Check you are not already involved
    if request.user in all_players_list:
        messages.success(request, (gettext("You have already joined this game")))
        errorFound = True

    # Check the host hasn't blacklisted you
    if currentGame.creator and request.user in currentGame.creator.profile.blacklistedPlayers.all():  # =request.user:
        messages.error(request, (gettext("The creator has blocked you from joining their games")))
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
    is_experienced = currentGame.presenter().isExperiencedGame()

    if is_experienced:
        # Optimization: Fetch SHADOW once
        shadow_user = User.objects.get(username="SHADOW")
        exp = (
            Game.objects.filter(
                gameCode=gameType,
                gameStatus="FINISHED",
                players__player=request.user,
            )
            .exclude(players__player=shadow_user)
            .distinct()
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
            except Exception as e:
                print(f"Discord webhook failed (new user exp): {e}")
            messages.error(
                request,
                (
                    mark_safe(
                        gettext(
                            'Not enough Experience. Plese see <a class="linkOther" href="/help/#navGameType">Help</a><br/>Current Experience Requirements:<br/><br/>FCM: 2 Games<br/>HLC: 1 Game<br/>Bus: 1 Game<br/>TGZ: 2 Games<br/>Cannes:2 Games<br/>Antiquity:2 Games<br/><br/>You may start your own game <a class="linkOther" href="/newGames/">Here</a>'
                        )
                    )
                ),
            )
            request.session["listType"] = "available"

            if ajaxReturn:
                return JsonResponse({"listToShow": "AVAILABLE", "show_div": True})
            return

        # Now check the fair play rating
        minus1year = int((datetime.datetime.now() - datetime.timedelta(days=365)).timestamp() * 1000)

        finishedGamesLastYear = 0
        kickedOutGamesLastYear = 0
        fairPlayLastYear = 100

        for game_name, _game_model in GAME_NAMES_MODELS.items():
            finishedGames = Game.objects.filter(
                Q(gameCode=game_name),
                Q(gameStatus="FINISHED"),
                ~Q(players__player__username="SHADOW"),
                Q(players__player=request.user),
            ).distinct()

            finishedGames_last_year = finishedGames.filter(Q(latestUpdate__gte=minus1year))
            kickedOutGames = finishedGames_last_year.filter(Q(players__is_kicked=True, players__player=request.user)).distinct()

            finishedGamesLastYear += finishedGames_last_year.count()
            kickedOutGamesLastYear += kickedOutGames.count()

        if kickedOutGamesLastYear > 0:
            kickedOutGamesLastYear -= 1
        if finishedGamesLastYear > 0:
            fairPlayLastYear = int((finishedGamesLastYear - kickedOutGamesLastYear) / finishedGamesLastYear * 100)

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
            except Exception as e:
                print(f"Discord webhook failed (fair play): {e}")
            messages.error(
                request,
                (mark_safe(gettext('Your Fair Play rating is too low: {fairplay}%. Please see <a class="linkOther" href="/help/#navGameType">Help</a><br/><br/>').format(fairplay=fairPlayLastYear))),
            )
            request.session["listType"] = "available"

            if ajaxReturn:
                return JsonResponse({"listToShow": "AVAILABLE", "show_div": True})
            return

    try:
        with transaction.atomic():
            selectedGameForJoin = Game.objects.select_for_update().get(id=gameID)
            # Re-verify count inside the lock to prevent double-joining
            current_count = selectedGameForJoin.players.count()
            # For Game model games, create a GamePlayer
            # GamePlayer.objects.create(game=currentGame, player=_newPlayer)

            # 2. RACE CONDITION CHECK: Ensure game didn't fill up while waiting for lock
            if current_count >= selectedGameForJoin.maxPlayers:
                messages.error(request, gettext("Sorry, this game just filled up."))
                if ajaxReturn:
                    return JsonResponse({"listToShow": "AVAILABLE"})
                return

            _newPlayer = request.user

            # Create GamePlayer with all required fields
            # Determine the next seat_order based on existing players
            max_seat_order = selectedGameForJoin.players.aggregate(max_seat=Max("seat_order"))["max_seat"]
            next_seat_order = (max_seat_order + 1) if max_seat_order is not None else 0

            GamePlayer.objects.create(
                game=selectedGameForJoin,
                player=_newPlayer,
                seat_order=next_seat_order,
                is_current=False,
                is_missing=False,
                is_kicked=False,
                has_chat_notification=False,
                winner=False,
                notes="",
            )

            # 4. UPDATE STATUS & METADATA
            selectedGameForJoin.latestUpdate = str(_latestUpdate)
            selectedGameForJoin.invitedPlayers.remove(request.user)

            # Calculate new count after addition
            new_total_count = current_count + 1

            # 5. START GAME LOGIC
            if new_total_count == selectedGameForJoin.maxPlayers:
                selectedGameForJoin.presenter().startGame(request)

                messages.success(
                    request,
                    (gettext("You have joined the game and the game has started")),
                )
                request.session["listType"] = "ACTIVE"
                response = JsonResponse({"listToShow": "ACTIVE"}, safe=False)
            else:
                # Check if it should move from WAITING to AVAILABLE
                # (If no more specific invites remain and game isn't private)
                remaining_invites = selectedGameForJoin.invitedPlayers.count()
                if remaining_invites == 0 and selectedGameForJoin.gameStatus != "PRIVATE":
                    selectedGameForJoin.gameStatus = "AVAILABLE"

                messages.success(
                    request,
                    gettext("You have joined the game - waiting for more players"),
                )
                response = JsonResponse({"listToShow": "WAITING"})

            selectedGameForJoin.save()
            return response
    except Exception as e:
        # Logic if the lock fails or an error occurs (the transaction will auto-rollback)
        SN_sendAdminErrorMessage(f"Error during join: {e}")
        if ajaxReturn:
            return JsonResponse({"error": "Could not join game"}, status=400)
        return


@login_required()
def deleteGame(request, gameCode):
    # Joining a game must be via POST
    if request.method != "DELETE":
        return JsonResponse({"error": "Invalid Request"}, status=400)

    jsonData = json.loads(request.body)

    gameModel = GAME_NAMES_MODELS.get(gameCode)
    try:
        if gameModel is None:
            return JsonResponse({"noGame": True}, safe=False)
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode=gameCode)
    except Game.DoesNotExist:
        return JsonResponse({"noGame": True}, safe=False)

    # Delete Training Game // Can never really fail
    if jsonData["action"] == "deleteTrgGame":
        if request.user == currentGame.creator:
            gameStatus = currentGame.gameStatus
            currentGame.delete()
            return JsonResponse(
                {
                    "gameType": gameCode,
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
                message += "User Is Authenticated: " + str(request.user.is_authenticated) + "\n"
                if request.user.is_authenticated:
                    message += "Email: " + request.user.email + "\n"

                requests.post(
                    f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                    data={"content": message},
                )
            except Exception as e:
                print(f"Discord webhook failed (delete game alert): {e}")

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


@login_required
def blacklistPlayer(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)
    if jsonData["action"] == "addPlayerToBlacklist":
        usernameToAdd = jsonData["blackListPlayer"]
        if usernameToAdd == request.user.username:
            return JsonResponse({"errorMessage": "You can't blacklist yourself."}, status=400)
        if User.objects.filter(username=usernameToAdd).exists():
            userProfile = Profile.objects.get(user=User.objects.get(username=request.user.username))
            userToAdd = User.objects.get(username=usernameToAdd)
            # Check if the user is already blacklisted
            if userToAdd in userProfile.blacklistedPlayers.all():
                return JsonResponse({"errorMessage": "User is already blacklisted."}, status=400)

            userProfile.blacklistedPlayers.add(userToAdd)
            userProfile.save()
            return JsonResponse({"success": True}, safe=False)
        else:
            return JsonResponse({"errorMessage": "User does not exist."}, status=400)

    elif jsonData["action"] == "removePlayerFromBlacklist":
        usernameToRemove = jsonData["blackListPlayer"]
        userProfile = Profile.objects.get(user=User.objects.get(username=request.user.username))
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
        if notification[1] and notification[1][0:15] != "https://discord" and notification[1][0:19] != "https://ptb.discord" and notification[1][0:18] != "https://discordapp":
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
        if notification[1] and notification[1][0:33] != "https://hooks.slack.com/services/":
            error_string = gettext("Please enter a Valid Slack Webhook URL")
            return JsonResponse({"errorMessage": error_string, "type": 1})

        # Validate Slack Member ID (optional, like Discord)
        slack_member_id = notification[2] if len(notification) > 2 else ""
        if slack_member_id and len(slack_member_id) < 8:
            error_string = gettext("Slack Member ID must be a valid alphanumeric ID (e.g., U123ABC456)")
            return JsonResponse({"errorMessage": error_string, "type": 1})
        if slack_member_id and not slack_member_id.replace("U", "").isalnum():
            error_string = gettext("Slack Member ID must be alphanumeric (starts with U)")
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
        TOKEN = config("TELEGRAM_OBG_BOT_TOKEN", default="BOT_TOKEN", cast=str)
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
        Game.objects.filter(
            Q(gameCode="TGZ"),
            Q(creator=userToProfile),
            Q(gameStatus="ACTIVE"),
            gameName__istartswith=tournamentKey,
            externalTournamentGame=True,
        ),
        key=lambda instance: instance.latestUpdate,
        reverse=True,
    )
    activeGamesListJson = [SF_fastSerializeGame(game, request.user) for game in activeGamesList]

    finishedGamesList = sorted(
        Game.objects.filter(
            Q(gameCode="TGZ"),
            Q(creator=userToProfile),
            Q(gameStatus="FINISHED"),
            gameName__istartswith=tournamentKey,
            externalTournamentGame=True,
        ),
        key=lambda instance: instance.latestUpdate,
        reverse=True,
    )
    finishedGamesListJson = [SF_fastSerializeGame(game, request.user) for game in finishedGamesList]

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
    # Fetch querysets
    availableGamesList = Game.objects.filter(gameStatus="AVAILABLE", gameCode="TGZ").order_by("-latestUpdate")
    activeGamesList = Game.objects.filter(gameStatus="ACTIVE", gameCode="TGZ").order_by("-latestUpdate")
    finishedGamesList = Game.objects.filter(gameStatus="FINISHED", gameCode="TGZ").order_by("-latestUpdate")

    # Filter finished games for startingOptions containing [7, 8, 9]
    filtered_finished_games = []
    for game in finishedGamesList:
        if game.startingOptions:
            starting_options = json.loads(game.startingOptions) if game.startingOptions else []
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
        finished_games_page = paginator.page(paginator.num_pages) if paginator.num_pages > 0 else paginator.page(1)
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
                    starting_options = json.loads(game.startingOptions) if game.startingOptions else []
                    logger.debug(f"Game {getattr(game, 'id', 'unknown')} (non-finished) startingOptions: {starting_options}")
                    if not isinstance(starting_options, list):
                        logger.warning(f"Game {getattr(game, 'id', 'unknown')} startingOptions is not a list: {starting_options}")
                        continue
                    if any(option in starting_options for option in [7, 8, 9]):
                        game_json.append(SF_fastSerializeGame(game, request.user))  # Use serializeLocal for consistency
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Error processing startingOptions for game {getattr(game, 'id', 'unknown')}: {e}")
                    continue
            else:
                logger.warning(f"Game {getattr(game, 'id', 'unknown')} has no startingOptions")

    # Serialize paginated finished games
    finishedGamesJson = []
    for game in finished_games_page.object_list:
        finishedGamesJson.append(SF_fastSerializeGame(game, request.user))

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


@login_required
def phpgames(request):
    # Fetch querysets
    availableGamesList = Game.objects.filter(gameStatus="AVAILABLE", gameCode="IND").order_by("-latestUpdate")
    activeGamesList = Game.objects.filter(gameStatus="ACTIVE", gameCode="IND").order_by("-latestUpdate")
    finishedGamesList = Game.objects.filter(gameStatus="FINISHED", gameCode="IND").order_by("-latestUpdate")

    # Filter finished games for startingOptions containing [7, 8, 9]
    filtered_finished_games = []
    for game in finishedGamesList:
        if game.startingOptions:
            starting_options = json.loads(game.startingOptions) if game.startingOptions else []
            if any(option in starting_options for option in [3]):
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
        finished_games_page = paginator.page(paginator.num_pages) if paginator.num_pages > 0 else paginator.page(1)
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
                    starting_options = json.loads(game.startingOptions) if game.startingOptions else []
                    if any(option in starting_options for option in [3]):
                        game_json.append(SF_fastSerializeGame(game, request.user))  # Use serializeLocal for consistency
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Error processing startingOptions for game {getattr(game, 'id', 'unknown')}: {e}")
                    continue
            else:
                pass

    # Serialize paginated finished games
    finishedGamesJson = []
    for game in finished_games_page.object_list:
        finishedGamesJson.append(SF_fastSerializeGame(game, request.user))

    return render(
        request,
        "Lobby/indPhpMap.html",
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


# NB THIS IS NOT ACCESSED> TGZ_Game DOES NOT EXIST EITHER. LEFT FOR REFERENCE
def TGZtournamentMain(request, tournamentName):
    ##### USE THIS FOR GROUPINGS
    # Find the tournament key
    #############

    # word_part = tournamentName[:-2].upper()
    # digit_part = tournamentName[-2:]
    # tournamentKey = word_part + " " + digit_part
    if 1 == 1:
        return render(request, "Lobby/TGZT/TGZtournamentFixedSummer25.html")

    tournamentKey = "TGZ Summer 25"  # Then immewdiately " A1" or " B2" NOTE THE KEY DOESN'T INCLUDE THE SPACE FOR SOME REASON

    # This line is common to all
    # allTournamentGames = TGZ_Game.objects.annotate(created_int=Cast("created", IntegerField())).filter(
    #    gameName__istartswith=tournamentKey,
    #    externalTournamentGame=True,
    #    created_int__gte=1751279600000,
    # )
    allTournamentGames = {}

    ## Split the gameName into groups based on letters A to G
    grouped_games = allTournamentGames.annotate(group=RawSQL("SUBSTRING(gameName, %s, %s)", (len(tournamentKey) + 2, 1))).values("group").annotate(count_games=Count("id"))

    tournamentData = []

    # Iterate through the groups
    for group in grouped_games:
        group_letter = group["group"]
        group_data = {"group": group_letter, "players": [], "games": []}

        games_in_group = allTournamentGames.filter(gameName__istartswith=tournamentKey + " " + group_letter)

        # Get unique players in the group
        unique_players = User.objects.filter(id__in=games_in_group.values_list("allPlayers", flat=True)).distinct()

        # Iterate through each player in the group
        for player in unique_players:
            player_games_finished = games_in_group.filter(allPlayers=player, gameStatus="FINISHED")

            # Count the number of games the player participated in
            num_games_finished = player_games_finished.count()

            # Count the number of games the player won
            num_games_won = player_games_finished.filter(winner=player).count()

            # Calculate tie breakers
            tie_breakers = []
            for game in player_games_finished:
                if game.winner != player and game.kickoutFlexiData != "":
                    kickout_data = json.loads(game.kickoutFlexiData)
                    winner_vp_vr = kickout_data[0][1] - kickout_data[0][2]

                    player_index = next(
                        (index for index, data in enumerate(kickout_data) if data[0] == player.username),
                        None,
                    )
                    if player_index is not None:
                        player_vp_vr = kickout_data[player_index][1] - kickout_data[player_index][2]
                        tie_breakers.append([-winner_vp_vr + player_vp_vr, game.id])

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
                "gameID": game.id,
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
@require_POST
def dataCheck(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    try:
        jsonData = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data."}, status=400)

    # 1. Check Available Count First (Lightest Queries)
    available_count = Tournament.objects.filter(tournamentStatus="OP", tournamentCategory="Mini").count()

    available_count += Game.objects.filter(gameStatus="AVAILABLE").count()

    if available_count != jsonData.get("availableCount", 0):
        return JsonResponse({"latest": False})

    # 2. Check Invitations Count (Medium Queries)
    invitations_count = 0

    invitations_count += Game.objects.filter(gameStatus="WAITING", invitedPlayers=request.user).count()

    if invitations_count != jsonData.get("invitationsCount", 0):
        return JsonResponse({"latest": False})

    # 3. Check My Move Count (Heaviest Logic)
    # Check cache first to stay at 0 hits for this section
    user_name = request.user.username

    my_move_count = 0

    # Add all Game model games my move count
    active_games = Game.objects.filter(gameStatus="ACTIVE", players__player=request.user).exclude(players__is_missing=True, players__player=request.user).prefetch_related("players__player").distinct()

    for g in active_games:
        if g.presenter().quickIsMyMove(user_name):
            my_move_count += 1

    if my_move_count != jsonData.get("myMoveCount", 0):
        return JsonResponse({"latest": False})
    # If all checks pass
    return JsonResponse({"latest": True})


@login_required
def discord_callback(request):
    code = request.GET.get("code")
    if not code:
        return redirect("profile")

    # Use config to get secrets from your .env file
    client_id = config("DISCORD_CLIENT_ID")
    client_secret = config("DISCORD_CLIENT_SECRET")

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "https://www.onlineboardgamers.com/discord/callback/",
    }

    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    response = requests.post("https://discord.com/api/oauth2/token", data=data, headers=headers)
    credentials = response.json()
    access_token = credentials.get("access_token")

    if not access_token:
        messages.error(request, "Failed to link Discord: No access token received.")
        return redirect("profile")

    bot_token = config("DISCORD_BOT_TOKEN")

    # 2. GET THE USER ID
    user_headers = {"Authorization": f"Bearer {access_token}"}
    user_resp = requests.get("https://discord.com/api/users/@me", headers=user_headers)
    discord_data = user_resp.json()
    discord_user_id = discord_data["id"]

    # 3. SAVE TO YOUR MODEL
    profile = Profile.objects.get(user=request.user)
    profile.discord_id = discord_user_id
    profile.save()

    # 4. FORCE-JOIN YOUR SERVER
    # This makes the user and bot share a server so DMs are possible
    guild_id = "1049719964208222279"
    join_url = f"https://discord.com/api/v10/guilds/{guild_id}/members/{discord_user_id}"

    join_headers = {"Authorization": f"Bot {bot_token}"}
    join_data = {"access_token": access_token}

    # This 'PUT' request actually adds the user to the server
    # This sends the "Join" request to Discord
    requests.put(join_url, json=join_data, headers=join_headers)

    new_join_message = "👋 **Welcome to the OnlineBoardGamers Discord Bot!**\n\n🔔 You'll receive game notifications here\n\n⚙️ You can turn off messages at any time from your profile"
    SN_sendDiscordDM(discord_user_id, new_join_message, "https://onlineboardgamers.com/profile/", "https://onlineboardgamers.com/profile/")

    #########

    messages.success(request, f"Linked as {discord_data['username']}! You'll now get Discord DM notifications.")
    return redirect("profile")


@login_required()
def stop_discord_dms(request):
    profile = Profile.objects.get(user=request.user)
    profile.discord_id = None
    profile.save()
    messages.success(request, "Discord DM notifications have been stopped")
    return redirect("profile")


@login_required()
def addWebhook(request):
    # Joining a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "Invalid Request method"}, status=400)

    webhookType = request.POST["webhookType"]
    webhookURL = request.POST.get("webhookURL", "") if "webhookURL" in request.POST else ""
    webhookUserID = request.POST.get("webhookUserID", "") if "webhookType" in request.POST else ""

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
    if webhookType == "DC" and webhookURL[0:15] != "https://discord" and webhookURL[0:19] != "https://ptb.discord" and webhookURL[0:18] != "https://discordapp":
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
            error_string = gettext("Slack Member ID must be a valid alphanumeric ID (e.g., U123ABC456)")
            return JsonResponse({"errorMessage": error_string, "type": 1})
        if slack_member_id and not slack_member_id.replace("U", "").isalnum():
            error_string = gettext("Slack Member ID must be alphanumeric (starts with U)")
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
    currentWebhooks = json.loads(profile.webhooks) if profile.webhooks != "" and profile.webhooks is not None else []
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
    webhookURL = request.POST.get("webhookURL", "") if "webhookURL" in request.POST else ""
    webhookUserID = request.POST.get("webhookUserID", "") if "webhookUserID" in request.POST else ""

    profile = Profile.objects.get(user=request.user)
    currentWebhooks = json.loads(profile.webhooks) if profile.webhooks != "" and profile.webhooks is not None else []
    if len(currentWebhooks) == 0:
        error_string = gettext("No webhooks to delete")
        messages.error(request, error_string)
        return redirect("profile")

    if (currentWebhooks[int(webhookID)][1] != webhookURL) or (currentWebhooks[int(webhookID)][2] != webhookUserID):
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
    if not request.user.is_superuser:
        return JsonResponse({"status": "error", "message": "Forbidden"}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8"))
        message = data.get("message")

        if message:
            SN_sendAdminErrorMessage(message)
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
    if isinstance(data, dict):
        final_dictionary = data
    else:
        try:
            final_dictionary = json.loads(data) if isinstance(data, str) else {}
        except (json.JSONDecodeError, TypeError) as e:
            print(f"BGH API Error: {e} Data: {data}")

    try:
        print(f"BGH API:: User: {request.user.username}   Options: {options}   Data: {final_dictionary.get('view_map_url', 'N/A')}")
    except Exception as e:
        print(f"BGH PRINT ERROR: {e}")

    return JsonResponse(final_dictionary)  # , safe=False)


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
    available_MT_raw = Tournament.objects.filter(tournamentStatus="OP", tournamentCategory="Mini").order_by("-created")
    current_MT_raw = Tournament.objects.filter(tournamentStatus="IP", tournamentCategory="Mini").order_by("-created")
    finished_MT_raw = Tournament.objects.filter(tournamentStatus="FN", tournamentCategory="Mini").order_by("-created")
    available_MT = [available_MT_raw_item.serialize() for available_MT_raw_item in available_MT_raw]
    current_MT = [current_MT_raw_item.serialize() for current_MT_raw_item in current_MT_raw]
    finished_MT = [finished_MT_raw_item.serialize() for finished_MT_raw_item in finished_MT_raw]
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
            Mini_Tournament = Tournament.objects.get(id=Mini_Tournament_id, tournamentCategory="Mini")
        except Tournament.DoesNotExist:
            raise Http404(gettext("Tournament does not exist")) from None
        # First check if it is a person declining an invite
        if "declineInvite" in request.POST and request.POST["declineInvite"] == "true":
            Mini_Tournament = Tournament.objects.get(id=Mini_Tournament_id, tournamentCategory="Mini")
            Mini_Tournament.startingPlayers.remove(request.user)
            Mini_Tournament.invitedPlayers.remove(request.user)
            Mini_Tournament.save()
            messages.success(request, (gettext("You have declined the tournament invitation")))
            return HttpResponseRedirect(reverse("MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id}))

        if "understand_movement" not in request.POST:
            messages.error(request, gettext("Please tick to confirm you can move regularly"))
            HttpResponseRedirect(reverse("MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id}))

        # Always remove from invited just in case
        Mini_Tournament.invitedPlayers.remove(request.user)

        if Mini_Tournament and Mini_Tournament.startingPlayers.count() < Mini_Tournament.maxTournamentPlayers:
            Mini_Tournament.startingPlayers.add(request.user)
            Mini_Tournament.save()
            if Mini_Tournament.startingPlayers.count() == Mini_Tournament.maxTournamentPlayers:
                SF_startAnyTournament(request, Mini_Tournament)
            messages.success(request, (gettext("You have joined the Tournament")))
        else:
            messages.error(request, gettext("The Tournament is already full"))
        return HttpResponseRedirect(reverse("MiniTournament", kwargs={"Mini_Tournament_id": Mini_Tournament_id}))

    try:
        Mini_Tournament = Tournament.objects.get(id=Mini_Tournament_id, tournamentCategory="Mini")
    except Tournament.DoesNotExist:
        raise Http404(gettext("Tournament does not exist")) from None

    # Common items
    chatData = Mini_Tournament.chatData
    startingOptionsHTML = ""
    if Mini_Tournament.gameCode == "FCM":
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(Mini_Tournament.startingOptions) if Mini_Tournament.startingOptions else [])
        if startingOptionsHTML == "[None]":
            startingOptionsHTML = "(No Starting Options)"
    elif Mini_Tournament.gameCode == "TGZ":
        startingOptionsHTML = SR_getTGZstartingOptionsHTML(json.loads(Mini_Tournament.startingOptions) if Mini_Tournament.startingOptions else [])

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
        pointsValues["bye"] = SR_getPointsForPosition(99, Mini_Tournament.maxGamePlayers)
    returnData = {
        "tournament": Mini_Tournament,
        "gameType": Mini_Tournament.gameCode,
        "startingOptionsHTML": startingOptionsHTML,
        "MT_CreationTimestamp": Mini_Tournament.created,
        "MT_ID": Mini_Tournament_id,
        "chatData": chatData,
        "creator": (Mini_Tournament.creator.username if Mini_Tournament.creator is not None else "None"),
        "pointsValues": pointsValues,
    }

    if Mini_Tournament.tournamentStatus == "OP" or Mini_Tournament.tournamentStatus == "PR":
        invitedPlayerList = [User.username for User in Mini_Tournament.invitedPlayers.all()]
        invitedPlayerString = ", ".join(invitedPlayerList)
        openSlots = []
        for i in range(
            Mini_Tournament.startingPlayers.count() + 1,
            Mini_Tournament.maxTournamentPlayers + 1,
        ):
            openSlots.append(str(i))
        returnData.update(
            {
                "startingPlayers": Mini_Tournament.startingPlayers.all().order_by("username"),
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

    if Mini_Tournament and Mini_Tournament.tournamentStatus == "IP" or Mini_Tournament and Mini_Tournament.tournamentStatus == "FN":
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
                "winnersData": (json.loads(Mini_Tournament.winnersData) if Mini_Tournament.winnersData else []),
            }
        )
        return render(
            request,
            "Lobby/tournaments/MiniTournament.html",
            returnData,
        )

    # Un-needed default return
    return render(request, "Lobby/tournaments/MiniTournament.html")


@login_required()
def sendMTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    MT_ID = jsonData["MT_ID"]

    with db_mutex("lockMT_" + str(MT_ID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _sendMTchatMessage(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


@login_required()
def _sendMTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    MT_ID = jsonData["MT_ID"]
    new_entry = jsonData["newEntry"]
    new_entry.insert(0, request.user.username)

    currentMT = Tournament.objects.get(id=MT_ID, tournamentCategory="Mini")

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
        Mini_Tournament = Tournament.objects.get(id=jsonData["MT_ID"], tournamentCategory="Mini")
    except Tournament.DoesNotExist:
        raise Http404(gettext("Mini Tournament does not exist")) from None

    return JsonResponse(
        {"chatData": Mini_Tournament.chatData},
        safe=True,
    )


@login_required
def createFCMminiTournament(request):
    # experienced = SF_hasRequiredExperience(request, "FCM", Game)
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
    invitedPlayers = json.loads(request.POST["invtedPlayersListMT"]) if request.POST["invtedPlayersListMT"] else []
    if "allowRewind" in request.POST:
        startgOptions.append(99)

    with transaction.atomic():
        newTournament = Tournament.objects.create(
            tournamentCategory="Mini",
            gameCode="FCM",
            tournamentName=request.POST["tournamentName"],
            tournamentDescription=request.POST["tournamentDescription"],
            tournamentStatus="OP",
            tournamentType=request.POST["tournamentFormat"],
            startingOptions=json.dumps(startgOptions) if startgOptions else None,
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

    from django_q.tasks import async_task

    async_task(
        "Lobby.sharedFunctions.sharedNotifications.SN_sendMiniTournamentInvite",
        invitedPlayers,
        newTournament.gameCode,
        newTournament.tournamentName,
        newTournament.tournamentDescription,
        newTournament.maxTournamentPlayers,
        newTournament.maxGamePlayers,
        SR_getTournamentTypeDisplay(newTournament.tournamentType),
        newTournament.id,
    )

    messages.success(request, SF_getMiniTournamentCreationJsonReturn(newTournament.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


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
            if isinstance(entry, list) and entry and entry[0] == 90 and any(12 <= num <= 23 for num in entry):
                startingOptions.append(7)
                break

    invitedPlayers = json.loads(request.POST["invtedPlayersListMT"]) if request.POST["invtedPlayersListMT"] else []

    with transaction.atomic():
        newTournament = Tournament.objects.create(
            tournamentCategory="Mini",
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

    from django_q.tasks import async_task

    async_task(
        "Lobby.sharedFunctions.sharedNotifications.SN_sendMiniTournamentInvite",
        invitedPlayers,
        newTournament.gameCode,
        newTournament.tournamentName,
        newTournament.tournamentDescription,
        newTournament.maxTournamentPlayers,
        newTournament.maxGamePlayers,
        SR_getTournamentTypeDisplay(newTournament.tournamentType),
        newTournament.id,
    )

    messages.success(request, SF_getMiniTournamentCreationJsonReturn(newTournament.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


###################################
#
#   MAIN TOURNAMENT VIEWS - MAIN-T
#
#####################################
@login_required()
def MainTournaments(request):
    available_MainT_raw = Tournament.objects.filter(tournamentStatus=OPEN, tournamentCategory="Main").order_by("-created")
    current_MainT_raw = Tournament.objects.filter(tournamentStatus="IP", tournamentCategory="Main").order_by("-created")
    finished_MainT_raw = Tournament.objects.filter(tournamentStatus="FN", tournamentCategory="Main").order_by("-created")
    available_MainT = [available_MainT_raw_item.serialize() for available_MainT_raw_item in available_MainT_raw]
    current_MainT = [current_MainT_raw_item.serialize() for current_MainT_raw_item in current_MainT_raw]
    finished_MainT = [finished_MainT_raw_item.serialize() for finished_MainT_raw_item in finished_MainT_raw]
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
            currentTournament = Tournament.objects.get(id=Main_Tournament_id, tournamentCategory="Main")
        except Tournament.DoesNotExist:
            raise Http404(gettext("Tournament does not exist")) from None

        if currentTournament.tournamentStatus not in [OPEN, PRIVATE]:
            messages.error(request, gettext("This tournament is not open for signup yet"))
            return HttpResponseRedirect(reverse("MainTournament", kwargs={"Main_Tournament_id": Main_Tournament_id}))

        if "understand_movement" not in request.POST:
            messages.error(request, gettext("Please tick to confirm you can move regularly"))
            return HttpResponseRedirect(reverse("MainTournament", kwargs={"Main_Tournament_id": Main_Tournament_id}))

        if currentTournament and currentTournament.startingPlayers.count() < currentTournament.maxTournamentPlayers:
            currentTournament.startingPlayers.add(request.user)
            currentTournament.save()
            if currentTournament.startingPlayers.count() == currentTournament.maxTournamentPlayers:
                SF_startAnyTournament(request, currentTournament)
            messages.success(request, (gettext("You have joined the Tournament")))
        else:
            messages.error(request, gettext("The Tournament is already full"))
        return HttpResponseRedirect(reverse("MainTournament", kwargs={"Main_Tournament_id": Main_Tournament_id}))

    try:
        currentTournament = Tournament.objects.get(id=Main_Tournament_id, tournamentCategory="Main")
    except Tournament.DoesNotExist:
        raise Http404(gettext("Tournament does not exist")) from None

    # Common items
    chatData = currentTournament.chatData
    startingOptionsHTML = ""
    if currentTournament.gameCode == "FCM":
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(currentTournament.startingOptions) if currentTournament.startingOptions else [])
        if startingOptionsHTML == "[None]":
            startingOptionsHTML = "(No Starting Options)"
    elif currentTournament.gameCode == "TGZ":
        startingOptionsHTML = SR_getTGZstartingOptionsHTML(json.loads(currentTournament.startingOptions) if currentTournament.startingOptions else [])

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
        pointsValues["bye"] = SR_getPointsForPosition(99, currentTournament.maxGamePlayers)
    returnData = {
        "tournament": currentTournament,
        "gameCode": currentTournament.gameCode,
        "startingOptionsHTML": startingOptionsHTML,
        "MainT_CreationTimestamp": currentTournament.created,
        "MainT_ID": Main_Tournament_id,
        "chatData": chatData,
        "pointsValues": pointsValues,
    }

    if currentTournament.tournamentStatus in [PENDING, OPEN, PRIVATE]:
        openSlots = []
        for i in range(
            currentTournament.startingPlayers.count() + 1,
            currentTournament.maxTournamentPlayers + 1,
        ):
            openSlots.append(str(i))
        returnData.update(
            {
                "startingPlayers": currentTournament.startingPlayers.all().order_by("username"),
                "openSlots": openSlots,
                "isSignedUp": currentTournament.isSignedUp(request.user),
            }
        )
        return render(
            request,
            "Lobby/tournaments/MainTournament.html",
            returnData,
        )

    if currentTournament and currentTournament.tournamentStatus == "IP" or currentTournament and currentTournament.tournamentStatus == "FN":
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
                "winnersData": (json.loads(currentTournament.winnersData) if currentTournament.winnersData else []),
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

    with db_mutex("lockMainT_" + str(MainT_ID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _sendMainTchatMessage(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


@login_required()
def _sendMainTchatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    MainT_ID = jsonData["MainT_ID"]
    new_entry = jsonData["newEntry"]
    new_entry.insert(0, request.user.username)

    currentMainT = Tournament.objects.get(id=MainT_ID, tournamentCategory="Main")

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
        currentTournament = Tournament.objects.get(id=jsonData["MainT_ID"], tournamentCategory="Main")
    except Tournament.DoesNotExist:
        raise Http404(gettext("Main Tournament does not exist")) from None

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
    startingOptions = json.dumps(SF_TGZadvancedOptions(request) if "enableAdvancedOptions" in request.POST else [])

    with transaction.atomic():
        newTournament = Tournament.objects.create(
            tournamentCategory="Main",
            gameCode="TGZ",
            tournamentName=request.POST["tournamentName"],
            tournamentDescription=request.POST["tournamentDescription"],
            tournamentStatus=PENDING,
            tournamentType=request.POST["tournamentFormat"],
            startingOptions=startingOptions,
            maxTournamentPlayers=request.POST["totalPlayersMT"],
            maxGamePlayers=request.POST["playersPerGameMT"],
            roundsBeforeKnockout=4,
        )
        newTournament.startingPlayers.add(request.user)
        if "privateTournament" in request.POST:
            newTournament.tournamentStatus = PRIVATE
        else:
            newTournament.tournamentStatus = OPEN

        newTournament.save()

    messages.success(request, "Your Tournament has been created")
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


def newDesign(request, design_num):
    """Render new design templates based on design number (1-12)"""
    template_map = {
        1: "Lobby/newDesign/01-functional-pro.html",
        2: "Lobby/newDesign/02-premium-dark.html",
        3: "Lobby/newDesign/03-forest-community.html",
        4: "Lobby/newDesign/04-modern-slate.html",
        5: "Lobby/newDesign/05-playful-bold.html",
        6: "Lobby/newDesign/06-xbox-cinematic.html",
        7: "Lobby/newDesign/07-gemini.html",
        8: "Lobby/newDesign/08-blue-utility.html",
        9: "Lobby/newDesign/09-dense-scoreboard.html",
        10: "Lobby/newDesign/10-icon-first-lobby.html",
        11: "Lobby/newDesign/11-split-context-lobby.html",
        12: "Lobby/newDesign/12-mobile-first-stack.html",
    }

    template = template_map.get(design_num)
    if not template:
        raise Http404("Design not found")

    return render(request, template)
