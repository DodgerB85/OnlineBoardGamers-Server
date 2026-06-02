# import time
import json
import random

# from django.contrib import messages
# from django.core.mail import get_connection, EmailMessage
import smtplib
import time
import urllib.parse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from decouple import config
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string

# from django.db import close_old_connections
# from django.core.mail import send_mail
from django.utils.translation import activate, get_language, gettext

import Lobby.sharedFunctions.constants as rf

# from django.core.mail import get_connection, EmailMessage
# from django.urls import reverse
# from django.http import HttpResponseRedirect
from Lobby.models import Profile, User

# Website Bots / AI / Shadow
USERNAMES_NOT_TO_NOTIFY = [
    "FcmBot",
    "FcmAI",
    "HcBot",
    "BusBot",
    "TgzBot",
    "CnsBot",
    "AqyBot",
    "IndBot",
    "RnbBot",
    "SHADOW",
    "SHADOW_2",
    "SHADOW_3",
    "SHADOW_4",
    "SHADOW_5",
]
# Users to ignore email-wise
USERNAMES_NOT_TO_EMAIL = [
    "spartan_medicine",
    "constitution",
    "heinzbeans",
    "Spellbound",
    "油炸DASHIT",
    "Stalin",
    "Aahhh",
]


def getGameStrings(game):
    if game == "FCM":
        return {
            "boxName": gettext("Food Chain Magnate"),
            "finishedSubject": gettext("Your Food Chain Magnate game has finished"),
            "yourTurnSubject": gettext("It is your turn in FCM"),
            "clickHereToPlayText": gettext("Click here to play FCM"),
            "bugReportSubject": gettext("FCM Bug Report"),
            "inviteSubject": gettext("Food Chain Magnate - Invitation Received"),
            "tournamentGameStartSubject": gettext("Food Chain Magnate - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Food Chain Magnate - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Food Chain Magnate - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Food Chain Magnate - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Food Chain Magnate game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for FCM"),
            "lessThan2hoursSubject": gettext("Food Chain Magnate - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Food Chain Magnate - Turn Expired"),
            "tournmentOpenSubject": gettext("Food Chain Magnate - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Food Chain Magnate - Mini Tournament Invitation Received"),
        }
    elif game == "HLC":
        return {
            "boxName": gettext("Horseless Carriage"),
            "finishedSubject": gettext("Your Horseless Carriage game has finished"),
            "yourTurnSubject": gettext("It is your turn at Horseless Carriage"),
            "clickHereToPlayText": gettext("Click here to play Horseless Carriage"),
            "bugReportSubject": gettext("HLC Bug Report"),
            "inviteSubject": gettext("Horseless Carriage - Invitation Received"),
            "tournamentGameStartSubject": gettext("Horseless Carriage - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Horseless Carriage - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Horseless Carriage - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Horseless Carriage - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Horseless Carriage game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Horseless Carriage"),
            "lessThan2hoursSubject": gettext("Horseless Carriage - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Horseless Carriage - Turn Expired"),
            "tournmentOpenSubject": gettext("Horseless Carriage - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Horseless Carriage - Mini Tournament Invitation Received"),
        }
    elif game == "BUS":
        return {
            "boxName": gettext("Bus"),
            "finishedSubject": gettext("Your Bus game has finished"),
            "yourTurnSubject": gettext("It is your turn at Bus"),
            "clickHereToPlayText": gettext("Click here to play Bus"),
            "bugReportSubject": gettext("Bus Bug Report"),
            "inviteSubject": gettext("Bus - Invitation Received"),
            "tournamentGameStartSubject": gettext("Bus - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Bus - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Bus - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Bus - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Bus game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Bus"),
            "lessThan2hoursSubject": gettext("Bus - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Bus - Turn Expired"),
            "tournmentOpenSubject": gettext("Bus - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Bus - Mini Tournament Invitation Received"),
        }
    elif game == "TGZ":
        return {
            "boxName": gettext("The Great Zimbabwe"),
            "finishedSubject": gettext("Your The Great Zimbabwe game has finished"),
            "yourTurnSubject": gettext("It is your turn in The Great Zimbabwe"),
            "clickHereToPlayText": gettext("Click here to play The Great Zimbabwe"),
            "bugReportSubject": gettext("TGZ Bug Report"),
            "inviteSubject": gettext("The Great Zimbabwe - Invitation Received"),
            "tournamentGameStartSubject": gettext("The Great Zimbabwe - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("The Great Zimbabwe - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("The Great Zimbabwe - Tournament Won!"),
            "miniTournamentWinSubject": gettext("The Great Zimbabwe - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Great Zimbabwe game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for TGZ"),
            "lessThan2hoursSubject": gettext("The Great Zimbabwe - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("The Great Zimbabwe - Turn Expired"),
            "tournmentOpenSubject": gettext("The Great Zimbabwe - Tournament Open for Signup"),
            "MTinviteSubject": gettext("The Great Zimbabwe - Mini Tournament Invitation Received"),
        }
    elif game == "CNS":
        return {
            "boxName": gettext("Cannes"),
            "finishedSubject": gettext("Your Cannes game has finished"),
            "yourTurnSubject": gettext("It is your turn in Cannes"),
            "clickHereToPlayText": gettext("Click here to play Cannes"),
            "bugReportSubject": gettext("CNS Bug Report"),
            "inviteSubject": gettext("Cannes - Invitation Received"),
            "tournamentGameStartSubject": gettext("Cannes - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Cannes - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Cannes - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Cannes - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Cannes game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Cannes"),
            "lessThan2hoursSubject": gettext("Cannes - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Cannes - Turn Expired"),
            "tournmentOpenSubject": gettext("Cannes - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Cannes - Mini Tournament Invitation Received"),
        }
    elif game == "AQY":
        return {
            "boxName": gettext("Antiquity"),
            "finishedSubject": gettext("Your Antiquity game has finished"),
            "yourTurnSubject": gettext("It is your turn in Antiquity"),
            "clickHereToPlayText": gettext("Click here to play Antiquity"),
            "bugReportSubject": gettext("AQY Bug Report"),
            "inviteSubject": gettext("Antiquity - Invitation Received"),
            "tournamentGameStartSubject": gettext("Antiquity - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Antiquity - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Antiquity - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Antiquity - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Antiquity game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Antiquity"),
            "lessThan2hoursSubject": gettext("Antiquity - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Antiquity - Turn Expired"),
            "tournmentOpenSubject": gettext("Antiquity - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Antiquity - Mini Tournament Invitation Received"),
        }
    elif game == "IND":
        return {
            "boxName": gettext("Indonesia"),
            "finishedSubject": gettext("Your Indonesia game has finished"),
            "yourTurnSubject": gettext("It is your turn in Indonesia"),
            "clickHereToPlayText": gettext("Click here to play Indonesia"),
            "bugReportSubject": gettext("IND Bug Report"),
            "inviteSubject": gettext("Indonesia - Invitation Received"),
            "tournamentGameStartSubject": gettext("Indonesia - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Indonesia - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Indonesia - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Indonesia - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Indonesia game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Indonesia"),
            "lessThan2hoursSubject": gettext("Indonesia - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Indonesia - Turn Expired"),
            "tournmentOpenSubject": gettext("Indonesia - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Indonesia - Mini Tournament Invitation Received"),
        }
    elif game == "KFW":
        return {
            "boxName": gettext("Keyflower"),
            "finishedSubject": gettext("Your Keyflower game has finished"),
            "yourTurnSubject": gettext("It is your turn in Keyflower"),
            "clickHereToPlayText": gettext("Click here to play Keyflower"),
            "bugReportSubject": gettext("Keyflower Bug Report"),
            "inviteSubject": gettext("Keyflower - Invitation Received"),
            "tournamentGameStartSubject": gettext("Keyflower - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Keyflower - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Keyflower - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Keyflower - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Keyflower game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Keyflower"),
            "lessThan2hoursSubject": gettext("Keyflower - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Keyflower - Turn Expired"),
            "tournmentOpenSubject": gettext("Keyflower - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Keyflower - Mini Tournament Invitation Received"),
        }
    elif game == "WEB":
        return {
            "boxName": gettext("Web"),
            "finishedSubject": gettext("Your Web game has finished"),
            "yourTurnSubject": gettext("It is your turn in Web"),
            "clickHereToPlayText": gettext("Click here to play Web"),
            "bugReportSubject": gettext("Web Bug Report"),
            "inviteSubject": gettext("Web - Invitation Received"),
            "tournamentGameStartSubject": gettext("Web - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Web - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Web - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Web - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Web game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for Web"),
            "lessThan2hoursSubject": gettext("Web - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Web - Turn Expired"),
            "tournmentOpenSubject": gettext("Web - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Web - Mini Tournament Invitation Received"),
        }
    elif game == "RNB":
        return {
            "boxName": gettext("Roads & Boats"),
            "finishedSubject": gettext("Your Roads & Boats game has finished"),
            "yourTurnSubject": gettext("It is your turn in Roads & Boats"),
            "clickHereToPlayText": gettext("Click here to play Roads & Boats"),
            "bugReportSubject": gettext("RNB Bug Report"),
            "inviteSubject": gettext("Roads & Boats - Invitation Received"),
            "tournamentGameStartSubject": gettext("Roads & Boats - Tournament Game Started"),
            "miniTournamentGameStartSubject": gettext("Roads & Boats - Mini Tournament Game Started"),
            "tournamentWinSubject": gettext("Roads & Boats - Tournament Won!"),
            "miniTournamentWinSubject": gettext("Roads & Boats - Mini Tournament Won!"),
            "gameStartSubject": gettext("Your Roads & Boats game has started"),
            "gameDeclineSubject": gettext("A player has declined your invitation for R&B"),
            "lessThan2hoursSubject": gettext("Roads & Boats - Less than 2 hours to move"),
            "turnExpiredSubject": gettext("Roads & Boats - Turn Expired"),
            "tournmentOpenSubject": gettext("Roads & Boats - Tournament Open for Signup"),
            "MTinviteSubject": gettext("Roads & Boats - Mini Tournament Invitation Received"),
            # UNIQUE TO RNB
            "yourPendingTurnSubject": gettext("You can set a move in Roads & Boats"),
            "yourTurnFixSubject": gettext("You need to fix your move in Roads & Boats"),
        }

    # Provide a default return
    return {
        "boxName": gettext("Game"),
        "finishedSubject": gettext("Your game has finished"),
        "yourTurnSubject": gettext("It is your turn"),
        "clickHereToPlayText": gettext("Click here to play"),
        "bugReportSubject": gettext("Bug Report"),
        "inviteSubject": gettext("Invitation Received"),
        "tournamentGameStartSubject": gettext("Tournament Game Started"),
        "miniTournamentGameStartSubject": gettext("Mini Tournament Game Started"),
        "tournamentWinSubject": gettext("Tournament Won!"),
        "miniTournamentWinSubject": gettext("Mini Tournament Won!"),
        "gameStartSubject": gettext("Your game has started"),
        "gameDeclineSubject": gettext("A player has declined your invitation"),
        "lessThan2hoursSubject": gettext("Less than 2 hours to move"),
        "turnExpiredSubject": gettext("Turn Expired"),
        "tournmentOpenSubject": gettext("Tournament Open for Signup"),
        "MTinviteSubject": gettext("Mini Tournament Invitation Received"),
    }


def shouldSendEmail(emailType, username, profile, currentGamePace):
    if username in USERNAMES_NOT_TO_NOTIFY:
        return False
    if not profile.email_confirmed:
        return False

    if emailType == "yourTurnFactoryFix":
        return True

    emailNotifications = json.loads(profile.emailNotifications) if profile.emailNotifications != "" and profile.emailNotifications is not None else [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]

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

    # YOUR TURN
    if emailType == "yourTurn":
        if yourTurnEmail == 0:
            return False
        if profile.stopEmailsUntil is not None:
            # find minutes from now until stopEmailsUntil
            now = round(time.time() / 60)
            stopEmailsUntil = profile.stopEmailsUntil
            minsToGo = stopEmailsUntil - now
            if minsToGo < 0:
                profile.stopEmailsUntil = None
                profile.save()
        # If it still is not None, then don't send
        if profile.stopEmailsUntil is not None:
            return False
        # If live then don't email
        return currentGamePace != 10

    # GAME INVITE
    if emailType == "gameInvite":
        return gameInviteEmail != 0

    if emailType == "gameDecline":
        return inviteDeclineEmail != 0

    # GAME START
    if emailType == "gameStart":
        return gameStartEmail != 0

    # GAME END
    if emailType == "gameEnd":
        return gameEndEmail != 0

    # 2 HOUR REMINDER
    if emailType == "2hourReminder":
        return twoHourReminderEmail != 0

    # TURN EXPIRED
    if emailType == "turnExpired":
        return turnExpiredEmail != 0

    # 24 hr Reminder
    if emailType == "24hrReminder":
        return dailyReminderEmail != 0

    # Tournament game start
    if emailType == "tournamentGameStart":
        return tournamentGameStartEmail != 0

    # Tournament win
    if emailType == "tournamentWin":
        return tournamentWinEmail != 0

    # Tournament admin
    if emailType == "tournamentOpen" or emailType == "MTinvite":
        return tournamentOpenEmail != 0

    # Final return
    return True

# This is async
def SN_M_sendEndGameNotificationAnyGame(gameCode, finalPositions, gameID, currentGamePace, currentGameName):
    # originalLang = get_language()

    # Pre-fetch users and profiles to avoid N+1 queries
    usernames = [entry[0] for entry in finalPositions]
    users = User.objects.filter(username__in=usernames).select_related('profile')
    user_dict = {user.username: user for user in users}

    for entry in finalPositions:
        # user = None
        userObj = user_dict.get(entry[0])
        if not userObj:
            print(f"Error: could not find user object for username '{entry[0]}' in SN_M_sendEndGameNotificationTieGame")
            continue
        try:
            profile = userObj.profile

            activate(profile.profileLanguage)

            posText = entry[1]

            gameStrings = getGameStrings(gameCode)

            box_name = gameStrings["boxName"]
            subject = gameStrings["finishedSubject"]

            if entry[2] == 0:
                subject += ". " + gettext("Congratulations!") + ""

            # SEND EMAIL
            if shouldSendEmail("gameEnd", userObj.username, profile, currentGamePace):
                message = render_to_string(
                    "Lobby/gameEmails/gameEndEmail.html",
                    {
                        "user": userObj.username,
                        "domain": "www.OnlineBoardGamers.com",
                        "gameID": gameID,
                        "gameName": currentGameName,
                        "box_name": box_name,
                        "position": posText,
                        "game": gameCode,
                    },
                )

                SN_sendEmail("gameEnd", subject, message, userObj.email)

            messageText = (
                userObj.username
                + ": "
                + gettext("%(box_name)s Game Finished!\n In %(gameName)s you came: %(result)s.")
                % {
                    "box_name": box_name,
                    "gameName": currentGameName,
                    "result": posText,
                }
            )
            urlText = gettext("Click here to view the game")

            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{userObj.username} Error: SN_M_sendEndGameNotificationTieGame -- game end error: {gameCode} /// {entry} /// {e}")
        # finally:
        #    # Reset to system default so the next user starts clean
        #    deactivate()

    # activate(originalLang)

# This is async schedule
def SN_sendNextTurnNotificationWithValidation(gameCode, playerList, gameID, gameName, expected_latestUpdate, expected_turn, expected_phase, expected_players, oldLatestUpdate):
    try:
        from Lobby.models import Game

        # 1. Use .only() or .get() to fetch the game
        try:
            current_game = Game.objects.get(id=gameID, gameCode=gameCode)
        except Game.DoesNotExist:
            return

        # 2. Early Exit: Validate state before doing any player logic
        if not (expected_latestUpdate == current_game.latestUpdate and expected_turn == current_game.turn and expected_phase == current_game.phase):
            print(f"{gameCode}: {gameID} has mismatched state. Skipping.")
            return

        # 3. Efficient Player Fetch:
        # Use values_list to get usernames in a SINGLE query without hitting the User model separately
        current_game_usernames = set(current_game.players.filter(is_current=True).exclude(player__username__in=rf.SHADOW_USERNAMES).values_list("player__username", flat=True))

        # 4. Use Set Intersection for speed
        # This replaces the 'for username in current_game_usernames' loop
        newPlayerList = list(current_game_usernames.intersection(playerList))

        # 5. Final Notification
        if newPlayerList:
            turn_string = current_game.presenter().currentTurnString()
            SN_sendNextTurnNotification(gameCode, newPlayerList, gameID, gameName, turn_string, current_game.gamePace, oldLatestUpdate)

    except Exception as e:
        print(f"Error in SN_sendNextTurnNotificationWithValidation: {e}")


# This is used by the function above to ACTUALY send the notification
def SN_sendNextTurnNotification(gameCode, playerList, gameID, gameName, currentGameTurnString, currentGamePace, oldLatestUpdate=0):
    # Pre-fetch users and profiles to avoid N+1 queries
    valid_players = [player for player in playerList if player not in USERNAMES_NOT_TO_NOTIFY]
    users = User.objects.filter(username__in=valid_players).select_related('profile')
    user_dict = {user.username: user for user in users}

    for player in valid_players:
        user = user_dict.get(player)
        if not user:
            print(f"Error: could not find user object in SN_sendNextTurnNotification: {player}")
            continue
        try:
            profile = user.profile
            activate(profile.profileLanguage)
            # Set up language vars

            gameStrings = getGameStrings(gameCode)
            subject = gameStrings["yourTurnSubject"]
            boxName = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]

            # messageText = user.username + ": " + gettext("Your turn at OnlineBoardGamers!\n%(gameName)s - %(currentTurnString)s.") % {"gameName": gameName, "currentTurnString": currentTurnString}

            messageText = user.username + ": " + gettext("Your turn at OnlineBoardGamers") + " - " + boxName + "\n" + gameName + " - " + currentGameTurnString

            # SEND EMAIL
            if shouldSendEmail("yourTurn", player, profile, currentGamePace):
                try:
                    message = render_to_string(
                        "Lobby/gameEmails/yourTurnEmail.html",
                        {
                            "game": gameCode,
                            "user": user.username,
                            "domain": "www.onlineboardgamers.com",
                            "gameID": gameID,
                            "gameName": gameName,
                            "currentTurnString": currentGameTurnString,
                            "boxName": boxName,
                        },
                    )
                    SN_sendEmail("yourTurn", subject, message, user.email)
                    # with get_connection(
                    # host=settings.EMAIL_HOST,
                    # port=settings.EMAIL_PORT,
                    # username=from_email,
                    # password=password,
                    # use_tls=settings.EMAIL_USE_TLS) as connection:
                    #    EmailMessage(subject, message, [user.email],
                    #    connection=connection).send()

                    # msg = MIMEMultipart()
                    # msg["From"] = from_email
                    # msg["To"] = user.email
                    # msg["Subject"] = subject
                    # msg.attach(MIMEText(message, "html"))
                    # server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                    # server.starttls()
                    # server.login(from_email, password)
                    # server.send_message(msg)
                    # server.quit()

                    # try:
                    #    with open("./Lobby/sharedFunctions/emailCounter.txt", "w") as file:
                    #        file.write(str(counter))
                    # except Exception as e:
                    #    print("SN_sendNextTurnNotification counter Exception: " + str(e))

                except Exception as e:
                    print(f"* * * EMAIL ERROR - Send Next Turn Notification ****************** {user.username} - {user.email} - {gameCode} - {gameID} - Error: {e}")
            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{player} /// ended the turn. SF {gameCode} sendNextTurnNotification.  Error no profile/other error trying to email /// {player} // {e}")

# This is async schedule
def SN_sendFixNextTurnNotificationWithValidation(gameCode, playerName, gameID, gameName, expected_latestUpdate, expected_turn, expected_phase):
    try:
        from Lobby.models import Game

        # 1. Use .only() or .get() to fetch the game
        try:
            current_game = Game.objects.get(id=gameID, gameCode=gameCode)
        except Game.DoesNotExist:
            return

        # 2. Early Exit: Validate state before doing any player logic
        if not (expected_latestUpdate == current_game.latestUpdate and expected_turn == current_game.turn and expected_phase == current_game.phase):
            print(f"{gameCode}: {gameID} has mismatched state. Skipping.")
            return

        # 3. Check if the player is still isCurrent
        if not current_game.players.filter(player__username=playerName, is_current=True).exists():
            print(f"{gameCode}: {gameID} - {playerName} is not current. Skipping.")
            return

        # 5. Final Notification
        if playerName:
            turn_string = current_game.presenter().currentTurnString()
            SN_sendFixNextTurnNotification(gameCode, [playerName], gameID, gameName, turn_string, current_game.gamePace)

    except Exception as e:
        print(f"Error in SN_sendFixNextTurnNotificationWithValidation: {e}")

# Used by above function to ACTUALLY send notifiation
def SN_sendFixNextTurnNotification(gameCode, playerList, gameID, gameName, turn_string, gamePace):
    originalLang = get_language()

    # Pre-fetch users and profiles to avoid N+1 queries
    valid_players = [player for player in playerList if player not in USERNAMES_NOT_TO_NOTIFY]
    users = User.objects.filter(username__in=valid_players).select_related('profile')
    user_dict = {user.username: user for user in users}

    for player in valid_players:
        user = user_dict.get(player)
        if not user:
            print(f"Error: could not find user object in SN_sendFixNextTurnNotification: {player}")
            continue
        try:
            profile = user.profile
            activate(profile.profileLanguage)
            # Set up language vars

            gameStrings = getGameStrings(gameCode)
            subject = gameStrings["yourTurnFixSubject"]
            boxName = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]

            # messageText = user.username + ": " + gettext("Your turn at OnlineBoardGamers!\n%(gameName)s - %(currentTurnString)s.") % {"gameName": gameName, "currentTurnString": currentTurnString}

            messageText = user.username + ": " + gettext("Other players have interfered with your move at OnlineBoardGamers") + " - " + boxName + "\n" + gameName + " - " + turn_string + "\n" + gettext("You will need to redo your move")

            # SEND EMAIL
            if shouldSendEmail("yourTurn", player, profile, gamePace):
                try:
                    message = render_to_string(
                        "Lobby/gameEmails/yourTurnFixRNBemail.html",
                        {
                            "game": gameCode,
                            "user": user.username,
                            "domain": "www.onlineboardgamers.com",
                            "gameID": gameID,
                            "gameName": gameName,
                            "currentTurnString": turn_string,
                            "boxName": boxName,
                        },
                    )
                    SN_sendEmail("yourTurn", subject, message, user.email)

                except Exception as e:
                    print(f"* * * * * EMAIL ERROR - Send Next Turn FIX Notification ****************** {user.username} - {user.email} - {gameCode} - {gameID} - Error: {e}")
            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{user.username} /// ended the turn. SF {gameCode} sendNextTurn_FIX_Notification.  Error no profile/other error trying to email /// {player} // {e}")

    activate(originalLang)

# This is async schedule
def SN_sendPendingRNBturnNotificationWithValidation(gameCode, playerList, gameID, gameName, expected_latestUpdate, expected_turn, expected_phase):
    try:
        from Lobby.models import Game

        # 1. Use .only() or .get() to fetch the game
        try:
            current_game = Game.objects.get(id=gameID, gameCode=gameCode)
        except Game.DoesNotExist:
            return

        # 2. Early Exit: Validate state before doing any player logic
        if not (expected_latestUpdate == current_game.latestUpdate and expected_turn == current_game.turn and expected_phase == current_game.phase):
            print(f"{gameCode}: {gameID} has mismatched state. Skipping.")
            return

        # 3. Efficient Player Fetch:
        # Use values_list to get usernames in a SINGLE query without hitting the User model separately
        #current_game_usernames = set(current_game.players.filter(is_current=True).exclude(player__username__in=rf.SHADOW_USERNAMES).values_list("player__username", flat=True))
        current_game_usernames = current_game.serverCurrentPlayerNamesInTurnOrder

        # 4. Only send notifications to names in current_game_usernames, but NOT current_game_usernames[0] (the presenter)
        newPlayerList = [username for username in playerList if username in current_game_usernames and username != current_game_usernames[0]]

        # 5. Final Notification
        if newPlayerList:
            turn_string = current_game.presenter().currentTurnString()
            SN_sendPendingRNBturnNotification(gameCode, newPlayerList, gameID, gameName, turn_string, current_game.gamePace)

    except Exception as e:
        print(f"Error in SN_sendPendingRNBturnNotificationWithValidation: {e}")


# Used by above function to ACTUALLY send notifiation
def SN_sendPendingRNBturnNotification(gameCode, playerList, gameID, gameName, turn_string, gamePace):
    for player in playerList:
        if player not in USERNAMES_NOT_TO_NOTIFY:
            try:
                user = User.objects.get(username=player)
            except User.DoesNotExist:
                print(f"Error: could not find user object in SN_sendPendingRNBturnNotification: {player}")
                continue
            except Exception as e:
                print(f"Error: could not find user object {player} in SN_sendPendingRNBturnNotification" + str(e))
                continue
            try:
                profile = Profile.objects.get(user=user)
                activate(profile.profileLanguage)
                # Set up language vars

                gameStrings = getGameStrings(gameCode)
                subject = gameStrings["yourPendingTurnSubject"]
                boxName = gameStrings["boxName"]
                urlText = gameStrings["clickHereToPlayText"]

                # messageText = user.username + ": " + gettext("Your turn at OnlineBoardGamers!\n%(gameName)s - %(currentTurnString)s.") % {"gameName": gameName, "currentTurnString": currentTurnString}

                messageText = user.username + ": " + gettext("You can move at OnlineBoardGamers") + " - " + boxName + "\n" + gameName + " - " + turn_string

                # SEND EMAIL
                if shouldSendEmail("yourTurn", player, profile, gamePace):
                    try:
                        message = render_to_string(
                            "Lobby/gameEmails/yourPendingTurnEmail.html",
                            {
                                "game": gameCode,
                                "user": user.username,
                                "domain": "www.onlineboardgamers.com",
                                "gameID": gameID,
                                "gameName": gameName,
                                "currentTurnString": turn_string,
                                "boxName": boxName,
                            },
                        )
                        SN_sendEmail("yourTurn", subject, message, user.email)

                    except Exception as e:
                        print(f"* * * * * EMAIL ERROR - Send Next Turn PENDING Notification ******************{str(e)} - {user.email} - {user.username} - {user} Error: {e}")
                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

                # SEND DISCORD DM

                if profile.discord_id != "" and profile.discord_id is not None:
                    SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

            except Exception as e:
                print(f"{user.username} /// ended the turn. SF {gameCode} sendNextTurnPENDINGNotification. Error no profile/other error trying to email. Player: {player}. Error: {e}")

    # activate(originalLang)


def SN_notifyStuckRNBTransaction(game_id, expected_transaction_id):
    """
    Called by Django-Q after a delay. If transactionID still matches,
    the client never completed recovery after saveStackMove — notify
    the waiting players to open the game.
    """
    try:
        from Lobby.models import Game
        try:
            current_game = Game.objects.get(id=game_id, gameCode="RNB")
        except Game.DoesNotExist:
            return

        # Recovery already happened — nothing to do
        if current_game.transactionID != expected_transaction_id:
            return

        player_names = current_game.serverCurrentPlayerNamesInTurnOrder or []
        if not player_names:
            return

        turn_string = current_game.presenter().currentTurnString()
        game_name = current_game.presenter().getGameName()
        _SN_sendStuckTransactionNotification(player_names, game_id, game_name, turn_string, current_game.gamePace)

    except Exception as e:
        print(f"Error in SN_notifyStuckRNBTransaction: {e}")


def _SN_sendStuckTransactionNotification(player_list, game_id, game_name, turn_string, game_pace):
    valid_players = [p for p in player_list if p not in USERNAMES_NOT_TO_NOTIFY]
    users = User.objects.filter(username__in=valid_players).select_related("profile")
    user_dict = {u.username: u for u in users}

    for player in valid_players:
        user = user_dict.get(player)
        if not user:
            print(f"Error: could not find user in _SN_sendStuckTransactionNotification: {player}")
            continue
        try:
            profile = user.profile
            activate(profile.profileLanguage)
            gameStrings = getGameStrings("RNB")
            subject = gameStrings["yourTurnSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            messageText = (
                user.username
                + ": "
                + gettext("A previous turn save may not have completed. Please open the game to continue.")
                + " - "
                + game_name
                + " - "
                + turn_string
            )
            if shouldSendEmail("yourTurn", player, profile, game_pace):
                try:
                    message = render_to_string(
                        "Lobby/gameEmails/yourTurnEmail.html",
                        {
                            "game": "RNB",
                            "user": user.username,
                            "domain": "www.onlineboardgamers.com",
                            "gameID": game_id,
                            "gameName": game_name,
                            "currentTurnString": turn_string,
                            "boxName": gameStrings["boxName"],
                        },
                    )
                    SN_sendEmail("yourTurn", subject, message, user.email)
                except Exception as e:
                    print(f"EMAIL ERROR - _SN_sendStuckTransactionNotification {user.username}: {e}")
            urlRaw = f"https://www.OnlineBoardGamers.com/RNB/{game_id}/show/"
            if profile.webhooks not in ("", None, "[]"):
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)
            if profile.discord_id not in ("", None):
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)
        except Exception as e:
            print(f"_SN_sendStuckTransactionNotification error for {player}: {e}")


# TODO async
def SN_sendFactoryAlertNotification(request, player, gameID, currentGame):
    if player in USERNAMES_NOT_TO_NOTIFY:
        return

    originalLang = get_language()

    try:
        user = User.objects.get(username=player)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_sendFactoryAlertNotification: {player}")
        return
    try:
        profile = Profile.objects.get(user=user)
        activate(profile.profileLanguage)

        gameStrings = getGameStrings("HLC")
        urlText = gameStrings["clickHereToPlayText"]

        presenter = currentGame.presenter()

        messageText = (
            user.username
            + ": "
            + gettext("Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs building\n%(gameName)s - %(currentTurnString)s.")
            % {
                "gameName": presenter.getGameName(),
                "currentTurnString": presenter.currentTurnString(),
            }
        )

        # SEND EMAIL
        if shouldSendEmail("yourTurnFactoryFix", player, profile, currentGame.gamePace):
            try:
                current_site = get_current_site(request)
                subject = gettext("It is your turn at Horseless Carriage - Factory Building")
                message = render_to_string(
                    "HLC/yourTurnEmailFactory.html",
                    {
                        "user": user.username,
                        "domain": current_site.domain,
                        "gameID": gameID,
                        "gameName": presenter.getGameName(),
                        "currentTurnString": presenter.currentTurnString(),
                    },
                )
                SN_sendEmail("yourTurnFactoryFix", subject, message, user.email)
            except Exception as e:
                print(f"\n{'*' * 36} EMAIL ERROR - Send Next Turn Notification FACTORY {'*' * 18}\nError: {e}\nUser:  {user.username} ({user.email})\nObj:   {user}\n")

        # SEND WEBHOOKS
        urlRaw = f"https://www.OnlineBoardGamers.com/HLC/{str(gameID)}/show/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        # SEND DISCORD DM

        if profile.discord_id != "" and profile.discord_id is not None:
            SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

    except Exception as e:
        print(f"{request.user.username} /// ended the turn. SF sendNextTurnNotificationFACTORY. Error no profile/other error trying to email. Player: {player}. Error: {e}")

    activate(originalLang)

# This is async
def SN_sendInviteNotifications(playerNames, _gameName, _maxPlayers, _gameCode):
    # Pre-fetch users and profiles to avoid N+1 queries
    users = User.objects.filter(username__in=playerNames).select_related('profile')
    user_dict = {user.username: user for user in users}

    for player in playerNames:
        user = user_dict.get(player)
        if not user:
            print(f"Error: could not find user object in SN_sendInviteNotifications: {player}")
            continue
        try:
            profile = user.profile

            originalLang = get_language()
            activate(profile.profileLanguage)

            gameStrings = getGameStrings(_gameCode)
            subject = gameStrings["inviteSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]

            # SEND EMAIL
            if shouldSendEmail("gameInvite", player, profile, -1):
                message = render_to_string(
                    "Lobby/email/gameInvite.html",
                    {
                        "user": user.username,
                        "domain": "www.onlineboardgamers.com",
                        "gameName": _gameName,
                        "maxPlayers": _maxPlayers,
                        "box_name": boxName,
                    },
                )
                SN_sendEmail("gameInvite", subject, message, user.email)

            messageText = user.username + ": " + gettext("Game invite at OnlineBoardGamers\n%(gameName)s - %(maxPlayers)s players") % {"gameName": _gameName, "maxPlayers": str(_maxPlayers)}

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/index/invitations/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

            activate(originalLang)

        except Exception as e:
            print(player + ": Error sending invite. Game: " + _gameName + "  Player: " + player + " " + str(e))


# This is async
def SN_sendMiniTournamentInvite(playerNames, _gameCode, _MTname, _MTdescription, _maxPlayers, _gamePlayers, _format, MT_ID):
    for player in playerNames:
        try:
            user = User.objects.get(username=player)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_sendInviteNotifications: {player}")
            continue
        except Exception as e:
            print(f"Error: could not find user object {player} in SN_sendInviteNotifications" + str(e))
            continue
        try:
            profile = Profile.objects.get(user=user)

            originalLang = get_language()
            activate(profile.profileLanguage)

            gameStrings = getGameStrings(_gameCode)
            subject = gameStrings["MTinviteSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]

            # SEND EMAIL
            if shouldSendEmail("MTinvite", player, profile, -1):
                message = render_to_string(
                    "Lobby/email/MTinvite.html",
                    {
                        "user": user.username,
                        "domain": "www.OnlineBoardGamers.com",
                        "MTname": _MTname,
                        "MTdescription": _MTdescription,
                        "maxPlayers": _maxPlayers,
                        "gamePlayers": _gamePlayers,
                        "format": _format,
                        "box_name": boxName,
                        "MT_ID": MT_ID,
                    },
                )
                SN_sendEmail("MTinvite", subject, message, user.email)

            messageText = (
                user.username
                + ": "
                + gettext("Mini Tournament invite at OnlineBoardGamers")
                + "\n"
                + _MTname
                + "\n"
                + ((_MTdescription + "\n") if _MTdescription != "" else "")
                + gettext("Format:")
                + " "
                + _format
                + "\n"
                + gettext("Total Tournament Players: %(_maxPlayers)s, Game Players: %(_gamePlayers)s") % {"_maxPlayers": str(_maxPlayers), "_gamePlayers": str(_gamePlayers)}
            )

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/MiniTournament/" + str(MT_ID) + "/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

            activate(originalLang)

        except Exception as e:
            print(player + ": Error sending Mini Tournament invite. Game: " + _gameCode + "  Player: " + player + " " + str(e))


def SN_M_T_sendTournamentWinNotification(tournamentCategory, tournamentName, _playerName, _gameCode):
    originalLang = get_language()
    try:
        user = User.objects.get(username=_playerName)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_M_T_sendTournamentWinNotification: {_playerName}")
        return
    except Exception as e:
        print(f"Error: could not find user object {_playerName} in SN_M_T_sendTournamentWinNotification" + str(e))
        return
    try:
        profile = Profile.objects.get(user=user)

        activate(profile.profileLanguage)
        gameStrings = getGameStrings(_gameCode)
        subject = gameStrings["tournamentWinSubject"]
        if tournamentCategory == "Mini":
            subject = gameStrings["miniTournamentWinSubject"]
        boxName = gameStrings["boxName"]

        # SEND EMAIL
        if shouldSendEmail("tournamentWin", _playerName, profile, -1):
            message = render_to_string(
                "Lobby/email/tournamentWonGeneral.html",
                {
                    "user": user.username,
                    "domain": "www.OnlineBoardGamers.com",
                    "tournamentName": tournamentName,
                    "boxName": boxName,
                },
            )
            SN_sendEmail("tournamentWin", subject, message, user.email)

        messageText = user.username + ": " + gettext("You have won a %(full_game_name)s tournament! \n%(tournamentName)s") % {"full_game_name": boxName, "tournamentName": tournamentName}
        urlText = gettext("Click here to savour in your victory")

        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        # SEND DISCORD DM
        if profile.discord_id != "" and profile.discord_id is not None:
            SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

    except Exception as e:
        print(f"{_playerName} Error SN_M_T_sendTournamentWinNotification. Notifying: {_playerName}. Error: {e}")

    activate(originalLang)

# This is async
def SN_M_sendGameStartNotification(playerListToNotify, message_data):
    errorUsername = message_data["username"]
    gameCode = message_data["gameCode"]
    gameID = message_data["gameID"]
    gameName = message_data["gameName"]
    currentPlayersString = message_data["currentPlayersString"]
    domain = message_data["domain"]
    maxPlayers = message_data["maxPlayers"]
    relatedMainTournamentID = message_data["relatedMainTournamentID"]
    relatedMiniTournamentID = message_data["relatedMiniTournamentID"]

    originalLang = get_language()

    # Pre-fetch users and profiles to avoid N+1 queries
    users = User.objects.filter(username__in=playerListToNotify).select_related('profile')
    user_dict = {user.username: user for user in users}

    for player in playerListToNotify:
        user = user_dict.get(player)
        if not user:
            print(f"Error: could not find user object in SN_M_sendGameStartNotification: {player}")
            continue
        try:
            profile = user.profile

            activate(profile.profileLanguage)

            gameStrings = getGameStrings(gameCode)
            subject = gameStrings["gameStartSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]

            messageText = (
                user.username
                + ": "
                + subject
                + "\n"
                + gettext("%(gameName)s - Starting Player:  %(currentPlayer)s.")
                % {
                    "gameName": gameName,
                    "currentPlayer": currentPlayersString,
                }
            )

            if relatedMainTournamentID > 0 or relatedMiniTournamentID > 0:
                # This runs only if the field exists AND is not None
                # Define defaults in case neither specific tournament type is present initially in the checks
                tournamentString = "game"

                if relatedMainTournamentID > 0:
                    subject = gameStrings["tournamentGameStartSubject"]
                    tournamentString = "mini tournament"
                    messageText = (
                        user.username
                        + ": "
                        + gettext("A Tournament Game of %(game_type)s has started\n%(gameName)s - %(maxPlayers)s players")
                        % {
                            "game_type": boxName,
                            "gameName": gameName,
                            "maxPlayers": maxPlayers,
                        }
                    )

                # Check mini tournament existence and value
                if relatedMiniTournamentID > 0:
                    tournamentString = "tournament"
                    subject = gameStrings["miniTournamentGameStartSubject"]
                    messageText = (
                        user.username
                        + ": "
                        + gettext("A Mini Tournament Game has started\n%(gameName)s - %(maxPlayers)s players")
                        % {
                            "gameName": gameName,
                            "maxPlayers": maxPlayers,
                        }
                    )

                if shouldSendEmail("tournamentGameStart", player, profile, -1):
                    message = render_to_string(
                        "Lobby/gameEmails/tournamentGameStart.html",
                        {
                            "user": user.username,
                            "domain": domain,
                            "gameID": gameID,
                            "game": gameCode,
                            "maxPlayers": maxPlayers,
                            "gameName": gameName,
                            "boxName": boxName,
                            "currentPlayer": currentPlayersString,
                            "tournamentString": tournamentString,
                        },
                    )
                    SN_sendEmail("tournamentGameStart", subject, message, user.email)

                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

                # SEND DISCORD DM

                if profile.discord_id != "" and profile.discord_id is not None:
                    SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

            # Otherwise, starting NON tourny game
            else:
                # SEND EMAIL
                if shouldSendEmail("gameStart", player, profile, -1):
                    message = render_to_string(
                        "Lobby/gameEmails/gameStartEmail.html",
                        {
                            "user": user.username,
                            "domain": domain,
                            "gameID": gameID,
                            "game": gameCode,
                            "gameName": gameName,
                            "currentPlayer": currentPlayersString,
                            "boxName": boxName,
                        },
                    )
                    SN_sendEmail("gameStart", subject, message, user.email)

                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

                # SEND DISCORD DM

                if profile.discord_id != "" and profile.discord_id is not None:
                    SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{errorUsername} Error. SN_M_sendGameStartNotification. Notifying {gameCode} Game Start: {player}. Error: {e}")

    activate(originalLang)

# This is async
def SN_sendDeclineEmail(declinerUsername, creatorUsername, gameCode, gameName, gameDescription, reason):
    originalLang = get_language()
    try:
        creatorObj = User.objects.get(username=creatorUsername)
        profile = Profile.objects.get(user=creatorObj)

        declinerObj = User.objects.get(username=declinerUsername)

        activate(profile.profileLanguage)

        box_name = getGameStrings(gameCode)["boxName"]

        gameDescription = gameDescription
        if gameDescription:
            gameDescription = f"({gameDescription})"
        gameStrings = getGameStrings(gameCode)

        if shouldSendEmail("gameDecline", creatorUsername, profile, -1):
            subject = gameStrings["gameDeclineSubject"]
            message = render_to_string(
                "Lobby/email/gameDeclineEmail.html",
                {
                    "creatorUsername": creatorUsername,
                    "declinerUsername": declinerObj.username,
                    "domain": "www.OnlineBoardGamers.com",
                    "gameName": box_name,
                    "gameDescription": gameDescription,
                    "box_name": box_name,
                    "reason": reason,
                },
            )
            SN_sendEmail("gameDecline", subject, message, creatorObj.email)

        messageText = (
            creatorUsername
            + ": "
            + gettext("A Player has declined your invitation\n%(gameName)s %(gameDescription)s\nPlayer: %(declinerUsername)s\nReason: %(reason)s")
            % {
                "gameName": gameName,
                "gameDescription": gameDescription,
                "declinerUsername": declinerObj.username,
                "reason": reason,
            }
        )
        urlText = gettext("Click here to view your games")
        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        # SEND DISCORD DM

        if profile.discord_id != "" and profile.discord_id is not None:
            SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

    except Exception as e:
        print(f"{declinerUsername} Error. SN_sendDeclineEmail. Notifying {creatorUsername}. Error: {e}")

    activate(originalLang)

# This is async
def SN_sendBugReportEmail(reporterUsername, reporterEmail, gameCode, gameID, gameData, bugDescription, rewindData, startingMap):
    subject = getGameStrings(gameCode)["bugReportSubject"]
    adminUser = User.objects.get(username="admin")
    message = render_to_string(
        "Lobby/gameEmails/email_bug.html",
        {
            "game": gameCode,
            "username": reporterUsername,
            "domain": "www.OnlineBoardGamers.com",
            "gameID": gameID,
            "gameData": gameData,
            "bugDescription": bugDescription,
            "userEmail": reporterEmail,
            "rewindData": rewindData,
            "startingMap": startingMap,
        },
    )
    bug_message = (
        f"BUG REPORT for game {gameCode} (ID: {gameID}).\n"
        f"User: {reporterUsername}\n"
        f"Bug Description: {bugDescription}\n"
        f"URL: <https://www.OnlineBoardGamers.com/{gameCode}/{gameID}/show/>"  # Added brackets here
        # f"Game Data: {gameData}\n"
        # f"Rewind Data: {rewindData}\n"
        # f"Starting Map: {startingMap}"
    )
    SN_sendAdminErrorMessage(bug_message)
    try:
        adminUser.email_user(subject, message)
    except Exception as e:
        error_message = f"BUG REPORT EMAIL SEND FAILED for game {gameCode} (ID: {gameID}).\nUser: {reporterUsername}\nError: {e}"
        SN_sendAdminErrorMessage(error_message)

# This is not async, but is only run from a script
def SN_sendReminderEmail(playerName, gameCode, gameID, gameName):
    originalLang = get_language()
    if playerName not in USERNAMES_NOT_TO_NOTIFY:
        try:
            user = User.objects.get(username=playerName)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_sendReminderEmail: {playerName}")
            return
        except Exception as e:
            print(f"Error: could not find user object {playerName} in SN_sendReminderEmail" + str(e))
            return

        try:
            profile = Profile.objects.get(user=user)

            activate(profile.profileLanguage)

            gameStrings = getGameStrings(gameCode)
            box_name = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]
            # SEND EMAIL
            if shouldSendEmail("2hourReminder", playerName, profile, -1):
                subject = gameStrings["lessThan2hoursSubject"]
                message = render_to_string(
                    "Lobby/email/gameReminderEmail.html",
                    {
                        "game": gameCode,
                        "playerName": playerName,
                        "domain": "www.OnlineBoardGamers.com",
                        "gameName": gameName,
                        "box_name": box_name,
                        "gameID": gameID,
                    },
                )
                SN_sendEmail("2hourReminder", subject, message, user.email)

            messageText = playerName + ": " + gettext("Less than 2 hours to move at OnlineBoardGamers!\n%(boxName)s: %(gameName)s") % {"boxName": box_name, "gameName": gameName}

            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{playerName} Error. SN_sendReminderEmail. Notifying {playerName}. Error: {e}")

    activate(originalLang)

# This is not async, but is only run from a script
def SN_sendReminderExpiredEmail(playerName, gameCode, gameID, gameName):
    originalLang = get_language()
    if playerName not in USERNAMES_NOT_TO_NOTIFY:
        try:
            user = User.objects.get(username=playerName)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_sendReminderExpiredEmail: {playerName}")
            return
        except Exception as e:
            print(f"Error: could not find user object {playerName} in SN_sendReminderExpiredEmail" + str(e))
            return

        try:
            profile = Profile.objects.get(user=user)
            activate(profile.profileLanguage)

            gameStrings = getGameStrings(gameCode)
            box_name = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]

            # SEND EMAIL
            if shouldSendEmail("turnExpired", playerName, profile, -1):
                subject = gameStrings["turnExpiredSubject"]
                message = render_to_string(
                    "Lobby/email/gameReminderExpiredEmail.html",
                    {
                        "game": gameCode,
                        "playerName": playerName,
                        "domain": "www.OnlineBoardGamers.com",
                        "gameName": gameName,
                        "box_name": box_name,
                        "gameID": gameID,
                    },
                )
                SN_sendEmail("turnExpired", subject, message, user.email)

            messageText = playerName + ": " + gettext("Your time limit has expired at OnlineBoardGamers!\n%(boxName)s: %(gameName)s\nYou could be kicked out at any time. Please move ASAP") % {"boxName": box_name, "gameName": gameName}

            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{gameCode}/{str(gameID)}/show/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM
            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{playerName} Error. SN_sendReminderExpiredEmail. Notifying {playerName}. Error: {e}")

    activate(originalLang)

# This is not async, but is only run from a script
def SN_send24HourTimedOutReminderEmail(user_obj, profile_obj, allPlayerMyMoveGamesList):
    username = user_obj.username
    originalLang = get_language()
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_send24HourTimedOutReminderEmail: {username} <<2")
        return
    except Exception as e:
        print(f"Error: could not find user object {username} in SN_send24HourTimedOutReminderEmail {str(e)} <<3")
        return

    try:
        # profile = Profile.objects.get(user=user)
        # currentGame = Bus_Game.objects.get(id=gameID)

        activate(profile_obj.profileLanguage)

        # Prepare game details for the email
        games_info = []
        for game, days_since_last_move in allPlayerMyMoveGamesList:
            presenter = game.presenter()
            gameName = presenter.getGameName()

            game_info = {
                "game_name": gameName,
                "days_since_last_move": days_since_last_move,
                "game_link": f"http://www.OnlineBoardGamers.com/{game.getGameCode()}/{game.id}/show/",  # Update with actual link format
            }
            games_info.append(game_info)

        # SEND EMAIL
        if shouldSendEmail("24hrReminder", username, profile_obj, -1):
            subject = gettext("It is Your Turn at OnlineBoardGamers.com")
            message = render_to_string(
                "Lobby/email/gameReminder24HrsExpiredEmail.html",
                {
                    "playerName": username,
                    "domain": "www.OnlineBoardGamers.com",
                    "games_info": games_info,
                },
            )
            SN_sendEmail("24hrReminder", subject, message, user.email)

        messageText = username + ": " + gettext("You have not moved for 24hrs at OnlineBoardGamers!\nPlease make a move to keep the games going! Thanks!")
        urlText = gettext("Click here to play")
        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile_obj.webhooks != "" and profile_obj.webhooks is not None and profile_obj.webhooks != "[]":
            SN_sendWebhooks(profile_obj, messageText, urlText, urlRaw)
        # SEND DISCORD DM
        if profile_obj.discord_id != "" and profile_obj.discord_id is not None:
            SN_sendDiscordDM(profile_obj.discord_id, messageText, urlText, urlRaw)

    except Exception as e:
        print(f"{username} Error. SN_send24HourTimedOutReminderEmail. Notifying {username}. Error: {e}")

    activate(originalLang)

# This is not async, but is only run from a script
def SN_sendTournamentOpen(new_tournament, gameCode):
    tournament_type_string = "Rounds"
    if new_tournament.tournamentType == "KO":
        tournament_type_string = "Knockout"
    elif new_tournament.tournamentType == "TL":
        tournament_type_string = "Two Lives"
    elif new_tournament.tournamentType == "PT":
        tournament_type_string = "Points"
    elif new_tournament.tournamentType == "RR":
        tournament_type_string = "Rounds"

    allUsers = User.objects.all()
    for _count, user in enumerate(allUsers, 1):
        try:
            profile = Profile.objects.get(user=user)

            activate(profile.profileLanguage)

            gameStrings = getGameStrings(gameCode)
            box_name = gameStrings["boxName"]
            urlText = "Click here to view Tournaments"

            # SEND EMAIL
            if shouldSendEmail("tournamentOpen", user.username, profile, -1):
                subject = gameStrings["tournmentOpenSubject"]
                message = render_to_string(
                    "Lobby/gameEmails/tournamentOpenEmail.html",
                    {
                        "username": user.username,
                        "domain": "www.OnlineBoardGamers.com",
                        "box_name": box_name,
                        "format": tournament_type_string,
                        "maxGamePlayers": new_tournament.maxGamePlayers,
                    },
                )
                SN_sendEmail("tournamentOpen", subject, message, user.email)

            messageText = gettext("A tournament of %(boxName)s is now open for signup\nYou can join the tournament here:") % {
                "boxName": box_name,
            }

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/AllTournaments/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            # SEND DISCORD DM

            if profile.discord_id != "" and profile.discord_id is not None:
                SN_sendDiscordDM(profile.discord_id, messageText, urlText, urlRaw)

        except Exception as e:
            print(f"{user.username} Error. SN_sendTournamentAnnounce. Notifying {user.username}. Error: {e}")


def SN_sendEmail(emailTypeFlag, subject, message, toEmail):
    # OBG_IDX = 0
    OBG_TURN_1_IDX = 1
    OBG_TURN_2_IDX = 2
    OBG_TURN_3_IDX = 3
    # OBG_TURN_4_IDX = 4
    OBG_MAILER_IDX = 5
    MAIN_EMAIL_IDX = 6
    # Start by defining all the outgoing options
    ADDRESSES = [
        "OnlineBoardGamers@gmail.com",  # 0
        "OnlineBoardGamers.turn1@gmail.com",  # 1
        "OnlineBoardGamers.turn2@gmail.com",  # 2
        "OnlineBoardGamers.turn3@gmail.com",  # 3
        "OnlineBoardGamers.turn4@gmail.com",  # 4
        "OnlineBoardGamers.mailer@gmail.com",  # 5
        "admin@onlineboardgamers.com",  # 6
    ]

    SERVERS = [
        "smtp.gmail.com",  # 0
        "smtp.gmail.com",  # 1
        "smtp.gmail.com",  # 2
        "smtp.gmail.com",  # 3
        "smtp.gmail.com",  # 4
        "smtp.gmail.com",  # 5
        config("MAIN_EMAIL_SERVER"),  # 6
    ]

    LOGINS = [
        "OnlineBoardGamers@gmail.com",  # 0
        "OnlineBoardGamers.turn1@gmail.com",  # 1
        "OnlineBoardGamers.turn2@gmail.com",  # 2
        "OnlineBoardGamers.turn3@gmail.com",  # 3
        "OnlineBoardGamers.turn4@gmail.com",  # 4
        "OnlineBoardGamers.mailer@gmail.com",  # 5
        config("MAIN_EMAIL_LOGIN"),  # 6
    ]

    PASSWORDS = [
        config("OBG_EMAIL_APP_PWD", default="", cast=str),  # 0
        config("OBG_TURN1_EMAIL_APP_PWD", default="", cast=str),  # !
        config("OBG_TURN2_EMAIL_APP_PWD", default="", cast=str),  # 2
        config("OBG_TURN3_EMAIL_APP_PWD", default="", cast=str),  # 3
        config("OBG_TURN4_EMAIL_APP_PWD", default="", cast=str),  # 4
        config("OBG_MAILER_EMAIL_APP_PWD", default="", cast=str),  # 5
        config("MAIN_EMAIL_PWD", default="", cast=str),  # 6
    ]

    idx = 0
    if emailTypeFlag == "gameInvite" or emailTypeFlag == "gameDecline" or emailTypeFlag == "gameStart" or emailTypeFlag == "gameEnd":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "2hourReminder" or emailTypeFlag == "turnExpired" or emailTypeFlag == "24hrReminder":
        idx = MAIN_EMAIL_IDX
    elif emailTypeFlag == "tournamentGameStart" or emailTypeFlag == "tournamentWin":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "tournamentOpen":
        idx = MAIN_EMAIL_IDX
    elif emailTypeFlag == "MTinvite":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "yourTurnFactoryFix":
        idx = MAIN_EMAIL_IDX
    elif emailTypeFlag == "yourTurn":
        counter = 0
        try:
            import os

            # Use absolute path to ensure file is found regardless of working directory
            counter_file_path = os.path.join(os.path.dirname(__file__), "emailCounter.txt")
            with open(counter_file_path, "r+") as file:
                counter = int(file.read())
                counter += 1
                if counter > 1600:
                    counter = 0
                file.seek(0)  # Move the file cursor to the beginning
                file.write(str(counter))
                file.truncate()  # Truncate any extra characters in the file
        except Exception as e:
            print("SN_sendEmail counter Exception: " + str(e))
            counter = random.randint(0, 1600)

        idx = OBG_TURN_1_IDX
        if counter > 400:
            idx = OBG_TURN_2_IDX
        if counter > 800:
            idx = OBG_TURN_3_IDX
        if counter > 1200:
            idx = MAIN_EMAIL_IDX
        if counter > 1600:
            counter = 0
        # if counter > 675:
        #    idx = 0
        # if counter > 900:
        #    idx = 0

    # HARD CODE IDX HERE
    idx = MAIN_EMAIL_IDX

    fromEmail = ADDRESSES[idx]
    # Validate and assert password type
    fromPassword = PASSWORDS[idx]
    if not isinstance(fromPassword, str) or not fromPassword:
        raise ValueError(f"Invalid or empty password for key: {idx}")
    loginUsername = LOGINS[idx]
    serverAddress = SERVERS[idx]

    if config("LOCAL_USER", default=True, cast=bool):
        user = User.objects.filter(email=toEmail).first()
        if user is None:
            user = User.objects.get(id=1)
        user.email_user(subject, message)
    else:
        try:
            msg = MIMEMultipart()
            msg["From"] = fromEmail
            msg["To"] = toEmail
            msg["Subject"] = subject
            msg.attach(MIMEText(message, "html"))

            # ADDED TIMEOUT=15: This stops the 184-second hang if Main Email is slow
            server = smtplib.SMTP(serverAddress, 587, timeout=30)
            server.starttls()
            server.login(loginUsername, fromPassword)
            server.send_message(msg)
            server.quit()

        except Exception as e:
            # Logs the error so you know why it failed without hanging the cluster
            error_msg = f"❌ Main Email Failure for {toEmail}: {e}"
            SN_sendAdminErrorMessage(error_msg)


def SN_sendWebhooks(profile, messageText, urlText, urlRaw):
    if profile.webhooks == "" or profile.webhooks is None or profile.webhooks == "[]":
        return

    # THERE IS NOTHING TO STOP LOCAL COPIES OF LIVE DB SENDING OUT REAL WEBHOOKS.
    # SO PERFORM A HACK HERE TO GENERALLY NOT SEND OUT WEBHOOKS
    if config("LOCAL_USER", default=True, cast=bool):
        # Get the username
        username = profile.user.username
        ALLOWED_LOCAL_USERS = [
            "admin",
            "DodgerB",
            "Joey",
            "Rachel",
            "Ross",
            "user1",
            "user2",
            "user3",
        ]
        if username not in ALLOWED_LOCAL_USERS:
            print(f"SUPRESSING WEBHOOKS FOR LOCAL USER: {username}")
            return

    try:
        webhooks = json.loads(profile.webhooks)
    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing webhooks: {profile.webhooks} Error: {e}")
        return
    with requests.Session() as session:
        for webhookData in webhooks:
            w_type = webhookData[0]
            w_url = webhookData[1]
            w_id = webhookData[2]

            try:
                ## Discord
                # if w_type == "DC":
                #    mention = f"<@{w_id}>\n" if w_id else ""
                #    content = f"{mention}{messageText}\n[{urlText}]({urlRaw})"
                #    session.post(w_url, data={"content": content}, timeout=10)
                # Discord
                if w_type == "DC":
                    mention = f"<@{w_id}>\n" if w_id else ""
                    # Wrap urlRaw in < > to suppress the auto-embed
                    content = f"{mention}{messageText}\n[{urlText}](<{urlRaw}>)"
                    session.post(w_url, json={"content": content}, timeout=10)
                # Slack
                elif w_type == "SL":
                    mention = f"<@{w_id}>\n" if w_id else ""
                    payload = {"text": f"{mention}{messageText}\n<{urlRaw}|{urlText}>"}
                    session.post(w_url, json=payload, timeout=10)

                # Telegram
                elif w_type == "TG":
                    TOKEN = config("TELEGRAM_OBG_BOT_TOKEN")
                    msg = f"{messageText}\n<a href='{urlRaw}'>{urlText}</a>"
                    encoded_msg = urllib.parse.quote(msg, safe=":/")
                    tg_url = f"https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={w_id}&text={encoded_msg}&parse_mode=HTML"
                    # message = "This is a test message from <b>Online Board Gamers</b> <a href='https://www.onlineboardgamers.com/profile/'>Click here to go to url</a>"
                    # encoded_message = urllib.parse.quote_plus(message, safe=':/')
                    # url = f"https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={webhookData[2]}&text={encoded_telegramMessage}&parse_mode=HTML"
                    # requests.post(url)
                    session.post(tg_url, timeout=10)

            except requests.exceptions.RequestException as e:
                SN_sendAdminErrorMessage(f"Webhook failed ({w_type}): {e} User: {profile.user.username}")
                # Log the specific webhook failure without stopping the loop
                print(f"Webhook failed ({w_type}): {e}")


def SN_sendDiscordDM(discordID, message_text, urlText, urlRaw):
    bot_token = config("DISCORD_BOT_TOKEN")

    complete_message = f"{message_text}\n[{urlText}](<{urlRaw}>)"

    # 1. SETUP
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}

    # 2. OPEN DM CHANNEL
    channel_resp = requests.post("https://discord.com/api/v10/users/@me/channels", json={"recipient_id": discordID}, headers=headers)

    if channel_resp.status_code == 200:
        channel_id = channel_resp.json()["id"]

        # 3. SEND THE MESSAGE
        requests.post(f"https://discord.com/api/v10/channels/{channel_id}/messages", json={"content": complete_message}, headers=headers)
    else:
        SN_sendAdminErrorMessage(f"Discord DM failed for id: ({discordID}): {channel_resp.text}")


def SN_sendAdminErrorMessage(message):
    try:
        requests.post(
            f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
            data={"content": message},
        )
    except Exception as e:
        print("sendAdminErrorMessage ERROR: " + str(e))
