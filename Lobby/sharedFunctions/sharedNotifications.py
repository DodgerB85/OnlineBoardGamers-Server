# import time
import requests
import json
import random
import time
import urllib.parse
from decouple import config, Csv

from django.utils.translation import gettext, activate, get_language
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site

# from django.core.mail import get_connection, EmailMessage

# from django.urls import reverse
# from django.http import HttpResponseRedirect
from Lobby.models import User, Profile

# from django.contrib import messages
# from django.core.mail import get_connection, EmailMessage

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from django.conf import settings

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
    elif game == "HC":
        return {
            "boxName": gettext("Horseless Carriage"),
            "finishedSubject": gettext("Your Horseless Carriage game has finished"),
            "yourTurnSubject": gettext("It is your turn at Horseless Carriage"),
            "clickHereToPlayText": gettext("Click here to play Horseless Carriage"),
            "bugReportSubject": gettext("HC Bug Report"),
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
    elif game == "Bus":
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


def shouldSendEmail(emailType, username, profile, currentGame, oldLatestUpdate):
    if username in USERNAMES_NOT_TO_NOTIFY:
        return False
    if not profile.email_confirmed:
        return False

    emailNotifications = (
        json.loads(profile.emailNotifications)
        if profile.emailNotifications != "" and profile.emailNotifications is not None
        else [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
    )

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
        if currentGame.gamePace == 10:
            return False
        # if currentGame.gamePace == 20:
        #    # str((int(time.time()) * 1000) + newVer)
        #    latestUpdate = int(int(oldLatestUpdate) / 1000)
        #    now = round(time.time())
        #    elapsedMinutes = int((now - latestUpdate) / 60)
        #    # .... if less than 5 minutes then false
        #    if elapsedMinutes <= 5:
        #        return False
        return True

    # GAME INVITE
    if emailType == "gameInvite":
        if gameInviteEmail == 0:
            return False
        # NB NO PROFILE PASSED IN AT THE MOMENT
        return True

    if emailType == "gameDecline":
        if inviteDeclineEmail == 0:
            return False
        return True

    # GAME START
    if emailType == "gameStart":
        if gameStartEmail == 0:
            return False
        return True

    # GAME END
    if emailType == "gameEnd":
        if gameEndEmail == 0:
            return False
        return True

    # 2 HOUR REMINDER
    if emailType == "2hourReminder":
        if twoHourReminderEmail == 0:
            return False
        return True

    # TURN EXPIRED
    if emailType == "turnExpired":
        if turnExpiredEmail == 0:
            return False
        return True

    # 24 hr Reminder
    if emailType == "24hrReminder":
        if dailyReminderEmail == 0:
            return False
        return True

    # Tournament game start
    if emailType == "tournamentGameStart":
        if tournamentGameStartEmail == 0:
            return False
        return True

    # Tournament win
    if emailType == "tournamentWin":
        if tournamentWinEmail == 0:
            return False
        return True

    # Tournament admin
    if emailType == "tournamentOpen" or emailType == "MTinvite":
        if tournamentOpenEmail == 0:
            return False
        return True

    # Final return
    return True


def SN_M_sendEndGameNotificationTieGame(request, game, finalPositions, gameID, currentGame):
    originalLang = get_language()
    for entry in finalPositions:
        #user = None
        try:
            user = User.objects.get(username=entry[0])
        except User.DoesNotExist:
            print(f"Error: could not find user object for username '{entry[0]}' in SN_M_sendEndGameNotificationTieGame")
            continue  
        except Exception as e:
            print(f"Unexpected error in SN_M_sendEndGameNotificationTieGame for username '{entry[0]}': {e}")
            continue
        try:
            if user.username != request.user.username:
                profile = Profile.objects.get(user=user)

                activate(profile.profileLanguage)

                posText = entry[1]

                gameStrings = getGameStrings(game)

                box_name = gameStrings["boxName"]
                subject = gameStrings["finishedSubject"]

                if entry[2] == 0:
                    subject += ". " + gettext("Congratulations!") + ""

                # SEND EMAIL
                if shouldSendEmail("gameEnd", user.username, profile, currentGame, 0):
                    current_site = get_current_site(request)

                    message = render_to_string(
                        "Lobby/gameEmails/gameEndEmail.html",
                        {
                            "user": user.username,
                            "domain": current_site.domain,
                            "gameID": gameID,
                            "gameName": currentGame.getGameName(),
                            "box_name": box_name,
                            "position": posText,
                            "game": game,
                        },
                    )

                    SN_sendEmail("gameEnd", subject, message, user.email)

                messageText = (
                    user.username
                    + ": "
                    + gettext("%(box_name)s Game Finished!\n In %(gameName)s you came: %(result)s.")
                    % {"box_name": box_name, "gameName": currentGame.getGameName(), "result": posText}
                )
                urlText = gettext("Click here to view the game")

                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        except Exception as e:
            print(
                request.user.username
                + " Error: SN_M_sendEndGameNotificationTieGame -- game end error: "
                + game
                + " /// "
                + str(entry)
                + " /// "
                + str(e)
            )
            print(e)

    activate(originalLang)


def SN_M_sendEndGameNotification(request, game, finalPositions, gameID, currentGame):
    originalLang = get_language()
    for pos, username in enumerate(finalPositions):
        if username == "FcmAI":
            message = ""
            if pos == 0:
                message += "Win for FcmAI\n"
            message += (
                "FcmAI Game Over. Pos: "
                + str(pos + 1)
                + "\n[Click here to see game](https://www.OnlineBoardGamers.com/FCM/"
                + str(currentGame.id)
                + "/)"
            )

            requests.post(
                f"https://discordapp.com/api/webhooks/{config.WEBHOOK_ADMIN_ERROR_MSG}",
                data={"content": message},
            )
        elif username != request.user.username:  # and username not in USERNAMES_NOT_TO_NOTIFY
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                print(f"Error: could not find user object for username '{username}' in SN_M_sendEndGameNotification")
                continue  # Skip to next entry if user not found    
            except Exception as e:
                print(f"Unexpected error in SN_M_sendEndGameNotification for username '{username}': {e}")
                continue
            try:
                profile = Profile.objects.get(user=user)

                activate(profile.profileLanguage)

                posText = "Last"
                if pos == 0:
                    posText = "1st - Congratulations!"
                if pos == 1:
                    posText = "2nd"
                if pos == 2:
                    posText = "3rd"
                if pos == 3:
                    posText = "4th"
                if pos == 4:
                    posText = "5th"
                if pos == 5:
                    posText = "6th"

                box_name = getGameStrings(game)["boxName"]
                subject = getGameStrings(game)["finishedSubject"]

                if pos == 0:
                    subject += ". " + gettext("Congratulations!") + ""

                # SEND EMAIL
                if shouldSendEmail("gameEnd", user.username, profile, currentGame, 0):
                    current_site = get_current_site(request)

                    message = render_to_string(
                        "Lobby/gameEmails/gameEndEmail.html",
                        {
                            "user": user.username,
                            "domain": current_site.domain,
                            "gameID": gameID,
                            "gameName": currentGame.getGameName(),
                            "box_name": box_name,
                            "position": posText,
                            "game": game,
                        },
                    )
                    SN_sendEmail("gameEnd", subject, message, user.email)

                messageText = (
                    user.username
                    + ": "
                    + gettext("%(box_name)s Game Finished!\n In %(gameName)s you came: %(result)s.")
                    % {"box_name": box_name, "gameName": currentGame.getGameName(), "result": posText}
                )
                urlText = gettext("Click here to view the game")

                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            except Exception as e:
                print(
                    request.user.username
                    + " Error: SN_M_sendEndGameNotification -- game end error: "
                    + game
                    + " /// "
                    + username
                )
                print(e)

    activate(originalLang)


def SN_sendNextTurnNotification(request, game, playerList, gameID, gameName, currentGame, oldLatestUpdate):
    originalLang = get_language()
    for player in playerList:
        if player not in USERNAMES_NOT_TO_NOTIFY:
            try:
                user = User.objects.get(username=player)
            except User.DoesNotExist:
                print(f"Error: could not find user object in SN_sendNextTurnNotification: {player}")
                continue
            except Exception as e:
                print(f"Error: could not find user object {player} in SN_sendNextTurnNotification" + str(e))
                continue
            try:
                profile = Profile.objects.get(user=user)
                activate(profile.profileLanguage)
                # Set up language vars
                currentTurnString = currentGame.currentTurnString()

                gameStrings = getGameStrings(game)
                subject = gameStrings["yourTurnSubject"]
                boxName = gameStrings["boxName"]
                urlText = gameStrings["clickHereToPlayText"]

                # messageText = user.username + ": " + gettext("Your turn at OnlineBoardGamers!\n%(gameName)s - %(currentTurnString)s.") % {"gameName": gameName, "currentTurnString": currentTurnString}

                messageText = (
                    user.username
                    + ": "
                    + gettext("Your turn at OnlineBoardGamers")
                    + " - "
                    + boxName
                    + "\n"
                    + gameName
                    + " - "
                    + currentTurnString
                )

                # SEND EMAIL
                if shouldSendEmail("yourTurn", player, profile, currentGame, oldLatestUpdate):
                    try:
                        current_site = get_current_site(request)

                        currentTurnString = currentGame.currentTurnString()
                        message = render_to_string(
                            "Lobby/gameEmails/yourTurnEmail.html",
                            {
                                "game": game,
                                "user": user.username,
                                "domain": current_site.domain,
                                "gameID": gameID,
                                "gameName": gameName,
                                "currentTurnString": currentTurnString,
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
                        print(
                            "************************************ EMAIL ERROR - Send Next Turn Notification ******************"
                        )
                        print(str(e))
                        print(user.email)
                        print(user.username)
                        print(user)
                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            except Exception as e:
                print(
                    request.user.username
                    + " /// ended the turn. SF "
                    + game
                    + " sendNextTurnNotification.  Error no profile/other error trying to email /// "
                    + player
                )
                print(e)

    activate(originalLang)


def SN_sendInviteNotifications(request, playerNames, _gameName, _maxPlayers, _game):
    for player in playerNames:
        try:
            user = User.objects.get(username=player)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_sendInviteNotifications: {player}")
            continue    
        except Exception as e:
            print(f"Error: could not find user object {player} in SN_sendInviteNotifications" + str(e))
            continue
        # profile = Profile.objects.get(id=user.id)
        try:
            profile = Profile.objects.get(user=user)

            originalLang = get_language()
            activate(profile.profileLanguage)

            current_site = get_current_site(request)
            gameStrings = getGameStrings(_game)
            subject = gameStrings["inviteSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]

            # SEND EMAIL
            if shouldSendEmail("gameInvite", player, profile, None, 0):
                message = render_to_string(
                    "Lobby/email/gameInvite.html",
                    {
                        "user": user.username,
                        "domain": current_site.domain,
                        "gameName": _gameName,
                        "maxPlayers": _maxPlayers,
                        "box_name": boxName,
                    },
                )
                SN_sendEmail("gameInvite", subject, message, user.email)

            messageText = (
                user.username
                + ": "
                + gettext("Game invite at OnlineBoardGamers\n%(gameName)s - %(maxPlayers)s players")
                % {"gameName": _gameName, "maxPlayers": str(_maxPlayers)}
            )

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            activate(originalLang)

        except Exception as e:
            print(
                request.user.username
                + ": Error sending invite. Game: "
                + _gameName
                + "  Player: "
                + player
                + " "
                + str(e)
            )


def SN_sendMiniTournamentInvite(request, playerNames, _game, _MTname, _MTdescription, _maxPlayers, _gamePlayers, _format, MT_ID):
    for player in playerNames:
        try:
            user = User.objects.get(username=player)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_sendInviteNotifications: {player}")
            continue
        except Exception as e:
            print(f"Error: could not find user object {player} in SN_sendInviteNotifications" + str(e))
            continue
        # profile = Profile.objects.get(id=user.id)
        try:
            profile = Profile.objects.get(user=user)

            originalLang = get_language()
            activate(profile.profileLanguage)

            current_site = get_current_site(request)
            gameStrings = getGameStrings(_game)
            subject = gameStrings["MTinviteSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]
            
            print(f"should send email: {shouldSendEmail('MTinvite', player, profile, None, 0)}")

            # SEND EMAIL
            if shouldSendEmail("MTinvite", player, profile, None, 0):
                message = render_to_string(
                    "Lobby/email/MTinvite.html",
                    {
                        "user": user.username,
                        "domain": current_site.domain,
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
                + "\n" + _MTname + "\n"
                + ((_MTdescription + "\n") if _MTdescription != "" else "") 
                + gettext("Format:") + " " + _format + "\n"
                + gettext("Total Tournament Players: %(_maxPlayers)s, Game Players: %(_gamePlayers)s")
                % {"_maxPlayers": str(_maxPlayers), "_gamePlayers": str(_gamePlayers)}
            )

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/MiniTournament/" + str(MT_ID) + "/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

            activate(originalLang)

        except Exception as e:
            print(
                request.user.username
                + ": Error sending Mini Tournament invite. Game: "
                + _game
                + "  Player: "
                + player
                + " "
                + str(e)
            )


def SN_M_T_sendTournamentGameStartNotification(
    request, _game, _player, _maxPlayers, _gameName, _currentTurnString, _gameID, stopEmail, tournamentType="normalTournament"
):
    # def sendTournamentInviteNotification(self, request, player, gameID):
    is_miniTournament = False
    if tournamentType == "miniTournament":
        is_miniTournament = True
    originalLang = get_language()
    try:
        user = User.objects.get(username=_player)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_M_T_sendTournamentGameStartNotification: {_player}")
        return
    except Exception as e:
        print(f"Error: could not find user object {_player} in SN_M_T_sendTournamentGameStartNotification" + str(e))
        return
    try:
        profile = Profile.objects.get(user=user)

        activate(profile.profileLanguage)
        gameStrings = getGameStrings(_game)
        box_name = gameStrings["boxName"]
        urlText = gameStrings["clickHereToPlayText"]

        # SEND EMAIL
        current_site = get_current_site(request)
        gameStrings = getGameStrings(_game)

        if not stopEmail and shouldSendEmail("tournamentGameStart", _player, profile, None, 0):
            subject = gameStrings["tournamentGameStartSubject"]
            if is_miniTournament:
                subject = gameStrings["miniTournamentGameStartSubject"]
            message = render_to_string(
                "Lobby/email/tournamentGameStart.html",
                {
                    "user": user.username,
                    "domain": current_site.domain,
                    "gameID": _gameID,
                    "maxPlayers": _maxPlayers,
                    "gameName": _gameName,
                    "currentTurnString": _currentTurnString,
                    "box_name": box_name,
                },
            )
            SN_sendEmail("tournamentGameStart", subject, message, user.email)

        messageText = (
            user.username
            + ": "
            + gettext("A Tournament Game of %(game_type)s has started\n%(gameName)s - %(maxPlayers)s players")
            % {"game_type": box_name, "gameName": _gameName, "maxPlayers": _maxPlayers}
        )
        if is_miniTournament:
            messageText = (
                user.username
                + ": "
                + gettext("A Mini Tournament Game has started\n%(gameName)s - %(maxPlayers)s players")
                % {"gameName": _gameName, "maxPlayers": _maxPlayers}
            )

        # SEND WEBHOOKS
        urlRaw = f"https://www.OnlineBoardGamers.com/{_game}/{str(_gameID)}/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

    except Exception as e:
        print(request.user.username + " SN_M_T_sendTournamentGameStartNotification Error. Player: " + _player)
        print(e)
    activate(originalLang)


def SN_M_T_sendTournamentWinNotification(tournament, request, _player, _game, _tournamentType):
    originalLang = get_language()
    try:
        user = User.objects.get(username=_player)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_M_T_sendTournamentWinNotification: {_player}")
        return
    except Exception as e:
        print(f"Error: could not find user object {_player} in SN_M_T_sendTournamentWinNotification" + str(e))
        return
    try:
        profile = Profile.objects.get(user=user)

        activate(profile.profileLanguage)
        gameStrings = getGameStrings(_game)
        subject = gameStrings["tournamentWinSubject"]
        if _tournamentType == "miniTournament":
            subject = gameStrings["miniTournamentWinSubject"]   
        boxName = gameStrings["boxName"]

        # SEND EMAIL
        if shouldSendEmail("tournamentWin", _player, profile, None, 0):
            current_site = get_current_site(request)
            message = render_to_string(
                "Lobby/email/tournamentWonGeneral.html",
                {
                    "user": user.username,
                    "domain": current_site.domain,
                    "tournamentName": tournament.tournamentName,
                    "boxName": boxName,
                },
            )
            SN_sendEmail("tournamentWin", subject, message, user.email)

        messageText = (
            user.username
            + ": "
            + gettext("You have won a %(full_game_name)s tournament! \n%(tournamentName)s")
            % {"full_game_name": boxName, "tournamentName": tournament.tournamentName}
        )
        urlText = gettext("Click here to savour in your victory")

        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

    except Exception as e:
        print(request.user.username + " Error SN_M_T_sendTournamentWinNotification. Notifying: " + _player)
        print(e)

    activate(originalLang)


def SN_M_sendGameStartNotification(request, game, playerList, gameID, currentGame):
    originalLang = get_language()
    for player in playerList:
        try:
            user = User.objects.get(username=player)
        except User.DoesNotExist:
            print(f"Error: could not find user object in SN_M_sendGameStartNotification: {player}")
            continue
        except Exception as e:
            print(f"Error: could not find user object {player} in SN_M_sendGameStartNotification" + str(e))
            continue

        try:
            profile = Profile.objects.get(user=user)

            activate(profile.profileLanguage)

            gameStrings = getGameStrings(game)
            subject = gameStrings["gameStartSubject"]
            urlText = gameStrings["clickHereToPlayText"]
            boxName = gameStrings["boxName"]


            messageText = (
                user.username
                + ": "
                + subject
                + "\n"
                + gettext("%(gameName)s - Starting Player:  %(currentPlayer)s.")
                % {"gameName": currentGame.gameName, "currentPlayer": currentGame.currentPlayers}
            )
            
            
            
            if hasattr(currentGame, 'relatedMainTournament') or hasattr(currentGame, 'relatedMiniTournament'):

                # Define defaults in case neither specific tournament type is present initially in the checks
                tournamentString = "game" 

                if hasattr(currentGame, 'relatedMainTournament') and currentGame.relatedMainTournament:
                    subject = gameStrings["tournamentGameStartSubject"]
                    tournamentString = "mini tournament" 
                    messageText = (
                        user.username
                        + ": "
                        + gettext("A Tournament Game of %(game_type)s has started\n%(gameName)s - %(maxPlayers)s players")
                        % {"game_type": boxName, "gameName": currentGame.getGameName(), "maxPlayers": currentGame.maxPlayers}
                    )    
                    
                # Check mini tournament existence and value
                if hasattr(currentGame, 'relatedMiniTournament') and currentGame.relatedMiniTournament:
                    tournamentString = "tournament" 
                    subject = gameStrings["miniTournamentGameStartSubject"]
                    messageText = (
                        user.username
                        + ": "
                        + gettext("A Mini Tournament Game has started\n%(gameName)s - %(maxPlayers)s players")
                        % {"gameName": currentGame.getGameName(), "maxPlayers": currentGame.maxPlayers}
                    )
            
                if shouldSendEmail("tournamentGameStart", player, profile, None, 0):
                    current_site = get_current_site(request)
                    message = render_to_string(
                        "Lobby/gameEmails/tournamentGameStart.html",
                        {
                            "user": user.username,
                            "domain": current_site.domain,
                            "gameID": gameID,
                            "game": game,
                            "maxPlayers": currentGame.maxPlayers,
                            "gameName": currentGame.getGameName(),
                            "boxName": boxName,
                            "currentPlayer": currentGame.currentPlayers,
                            "tournamentString": tournamentString,
                        },
                    )
                    SN_sendEmail("tournamentGameStart", subject, message, user.email)
                    
                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)
                    
            # Otherwise, starting NON tourny game
            else:
                # SEND EMAIL
                if shouldSendEmail("gameStart", player, profile, None, 0):
                    current_site = get_current_site(request)
                    message = render_to_string(
                        "Lobby/gameEmails/gameStartEmail.html",
                        {
                            "user": user.username,
                            "domain": current_site.domain,
                            "gameID": gameID,
                            "game": game,
                            "gameName": currentGame.getGameName(),
                            "currentPlayer": currentGame.currentPlayers,
                            "boxName": boxName,
                        },
                    )
                    SN_sendEmail("gameStart", subject, message, user.email)

                # SEND WEBHOOKS
                urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
                if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                    SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        except Exception as e:
            print(
                request.user.username
                + " Error. SN_M_sendGameStartNotification. Notifying "
                + game
                + " Game Start: "
                + player
            )
            print(e)

    activate(originalLang)


def SN_sendDeclineEmail(request, declinerObj, _game, currentGame, reason):
    originalLang = get_language()
    try:
        profile = Profile.objects.get(user=currentGame.creator)

        activate(profile.profileLanguage)

        box_name = getGameStrings(_game)["boxName"]

        gameDescription = currentGame.gameDescription
        if gameDescription:
            gameDescription = f"({gameDescription})"
        current_site = get_current_site(request)
        gameStrings = getGameStrings(_game)
        if shouldSendEmail("gameDecline", currentGame.creator.username, profile, None, 0):
            subject = gameStrings["gameDeclineSubject"]
            message = render_to_string(
                "Lobby/email/gameDeclineEmail.html",
                {
                    "creatorUsername": currentGame.creator.username,
                    "declinerUsername": declinerObj.username,
                    "domain": current_site.domain,
                    "gameName": currentGame.getGameName(),
                    "gameDescription": gameDescription,
                    "box_name": box_name,
                    "reason": reason,
                },
            )
            SN_sendEmail("gameDecline", subject, message, currentGame.creator.email)

        messageText = (
            currentGame.creator.username
            + ": "
            + gettext(
                "A Player has declined your invitation\n%(gameName)s %(gameDescription)s\nPlayer: %(declinerUsername)s\nReason: %(reason)s"
            )
            % {
                "gameName": currentGame.getGameName(),
                "gameDescription": currentGame.gameDescription,
                "declinerUsername": declinerObj.username,
                "reason": reason,
            }
        )
        urlText = gettext("Click here to view your games")
        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
            SN_sendWebhooks(profile, messageText, urlText, urlRaw)

    except Exception as e:
        print(request.user.username + " Error. SN_sendDeclineEmail. Notifying " + currentGame.creator.username)
        print(e)

    activate(originalLang)


def SN_sendBugReportEmail(request, game, gameID, gameData, bugDescription, rewindData, startingMap):
    current_site = get_current_site(request)
    subject = getGameStrings(game)["bugReportSubject"]
    adminUser = User.objects.get(username="admin")
    message = render_to_string(
        "Lobby/gameEmails/email_bug.html",
        {
            "game": game,
            "username": request.user.username,
            "domain": current_site.domain,
            "gameID": gameID,
            "gameData": gameData,
            "bugDescription": bugDescription,
            "userEmail": request.user.email,
            "rewindData": rewindData,
            "startingMap": startingMap,
        },
    )
    bug_message = (
        f"BUG REPORT for game {game} (ID: {gameID}).\n"
        f"User: {request.user.username}\n"
        f"Bug Description: {bugDescription}\n"
        #f"Game Data: {gameData}\n"
        #f"Rewind Data: {rewindData}\n"
        #f"Starting Map: {startingMap}"
    )
    SN_sendAdminErrorMessage(request, bug_message)
    try:
        adminUser.email_user(subject, message)
    except Exception as e:
        error_message = (
            f"BUG REPORT EMAIL SEND FAILED for game {game} (ID: {gameID}).\n"
            f"User: {request.user.username}\n"
            f"Error: {e}"
        )
        SN_sendAdminErrorMessage(request, error_message)
    


def SN_sendReminderEmail(playerName, game, gameID, gameName):
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

            gameStrings = getGameStrings(game)
            box_name = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]
            # SEND EMAIL
            if shouldSendEmail("2hourReminder", playerName, profile, None, 0):
                subject = gameStrings["lessThan2hoursSubject"]
                message = render_to_string(
                    "Lobby/email/gameReminderEmail.html",
                    {
                        "game": game,
                        "playerName": playerName,
                        "domain": "www.OnlineBoardGamers.com",
                        "gameName": gameName,
                        "box_name": box_name,
                        "gameID": gameID,
                    },
                )
                SN_sendEmail("2hourReminder", subject, message, user.email)

            messageText = (
                playerName
                + ": "
                + gettext("Less than 2 hours to move at OnlineBoardGamers!\n%(boxName)s: %(gameName)s")
                % {"boxName": box_name, "gameName": gameName}
            )

            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        except Exception as e:
            print(playerName + " Error. SN_sendReminderEmail. Notifying " + playerName)
            print(e)

    activate(originalLang)


def SN_sendReminderExpiredEmail(playerName, game, gameID, gameName):
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

            gameStrings = getGameStrings(game)
            box_name = gameStrings["boxName"]
            urlText = gameStrings["clickHereToPlayText"]

            # SEND EMAIL
            if shouldSendEmail("turnExpired", playerName, profile, None, 0):
                subject = gameStrings["turnExpiredSubject"]
                message = render_to_string(
                    "Lobby/email/gameReminderExpiredEmail.html",
                    {
                        "game": game,
                        "playerName": playerName,
                        "domain": "www.OnlineBoardGamers.com",
                        "gameName": gameName,
                        "box_name": box_name,
                        "gameID": gameID,
                    },
                )
                SN_sendEmail("turnExpired", subject, message, user.email)

            messageText = (
                playerName
                + ": "
                + gettext(
                    "Your time limit has expired at OnlineBoardGamers!\n%(boxName)s: %(gameName)s\nYou could be kicked out at any time. Please move ASAP"
                )
                % {"boxName": box_name, "gameName": gameName}
            )

            # SEND WEBHOOKS
            urlRaw = f"https://www.OnlineBoardGamers.com/{game}/{str(gameID)}/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        except Exception as e:
            print(playerName + " Error. SN_sendReminderExpiredEmail. Notifying " + playerName)
            print(e)

    activate(originalLang)


def SN_send24HourTimedOutReminderEmail(user_obj, profile_obj, allPlayerMyMoveGamesList):
    username = user_obj.username
    originalLang = get_language()
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"Error: could not find user object in SN_send24HourTimedOutReminderEmail: {username}")
        return
    except Exception as e:
        print(f"Error: could not find user object {username} in SN_send24HourTimedOutReminderEmail" + str(e))
        return

    try:
        #profile = Profile.objects.get(user=user)
        # currentGame = Bus_Game.objects.get(id=gameID)

        activate(profile_obj.profileLanguage)

        # Prepare game details for the email
        games_info = []
        for game, days_since_last_move in allPlayerMyMoveGamesList:
            game_info = {
                "game_name": game.getGameName(),
                "days_since_last_move": days_since_last_move,
                "game_link": f"http://www.OnlineBoardGamers.com/{game.getGameCode()}/{game.id}/",  # Update with actual link format
            }
            games_info.append(game_info)

        # SEND EMAIL
        if shouldSendEmail("24hrReminder", username, profile_obj, None, 0):
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

        messageText = (
            username
            + ": "
            + gettext(
                "You have not moved for 24hrs at OnlineBoardGamers!\nPlease make a move to keep the games going! Thanks!"
            )
        )
        urlText = gettext("Click here to play")
        # SEND WEBHOOKS
        urlRaw = "https://www.OnlineBoardGamers.com/"
        if profile_obj.webhooks != "" and profile_obj.webhooks is not None and profile_obj.webhooks != "[]":
            SN_sendWebhooks(profile_obj, messageText, urlText, urlRaw)

    except Exception as e:
        print(username + " Error. SN_send24HourTimedOutReminderEmail. Notifying " + username)
        print(e)

    activate(originalLang)


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
    count = 0
    for user in allUsers:
        count += 1
        try:
            profile = Profile.objects.get(user=user)

            activate(profile.profileLanguage)

            gameStrings = getGameStrings(gameCode)
            box_name = gameStrings["boxName"]
            urlText = "Click here to view Tournaments"

            # SEND EMAIL
            if shouldSendEmail("tournamentOpen", user.username, profile, None, 0):
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

            messageText = gettext(
                "A tournament of %(boxName)s is now open for signup\nYou can join the tournament here:"
            ) % {
                "boxName": box_name,
            }

            # SEND WEBHOOKS
            urlRaw = "https://www.OnlineBoardGamers.com/AllTournaments/"
            if profile.webhooks != "" and profile.webhooks is not None and profile.webhooks != "[]":
                SN_sendWebhooks(profile, messageText, urlText, urlRaw)

        except Exception as e:
            print(user.username + " Error. SN_sendTournamentAnnounce. Notifying " + user.username)
            print(e)


def SN_sendEmail(emailTypeFlag, subject, message, toEmail):
    OBG_IDX = 0
    OBG_TURN_1_IDX = 1
    OBG_TURN_2_IDX = 2
    OBG_TURN_3_IDX = 3
    # OBG_TURN_4_IDX = 4
    OBG_MAILER_IDX = 5
    MAIL_RELAY_IDX = 6
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
        "smtp1.s.ipzmarketing.com",  # 6
    ]

    LOGINS = [
        "OnlineBoardGamers@gmail.com",  # 0
        "OnlineBoardGamers.turn1@gmail.com",  # 1
        "OnlineBoardGamers.turn2@gmail.com",  # 2
        "OnlineBoardGamers.turn3@gmail.com",  # 3
        "OnlineBoardGamers.turn4@gmail.com",  # 4
        "OnlineBoardGamers.mailer@gmail.com",  # 5
        config("MAIL_RELAY_LOGIN"),  # 6
    ]

    PASSWORDS = [
        config("OBG_EMAIL_APP_PWD", default="", cast=str),  # 0
        config("OBG_TURN1_EMAIL_APP_PWD", default="", cast=str),  # !
        config("OBG_TURN2_EMAIL_APP_PWD", default="", cast=str),  # 2
        config("OBG_TURN3_EMAIL_APP_PWD", default="", cast=str),  # 3
        config("OBG_TURN4_EMAIL_APP_PWD", default="", cast=str),  # 4
        config("OBG_MAILER_EMAIL_APP_PWD", default="", cast=str),  # 5
        config("MAIL_RELAY_PWD", default="", cast=str),  # 6
    ]

    idx = 0
    if emailTypeFlag == "gameInvite":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "gameDecline":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "gameStart":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "gameEnd":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "2hourReminder":
        idx = MAIL_RELAY_IDX
    elif emailTypeFlag == "turnExpired":
        idx = MAIL_RELAY_IDX
    elif emailTypeFlag == "24hrReminder":
        idx = MAIL_RELAY_IDX
    elif emailTypeFlag == "tournamentGameStart":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "tournamentWin":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "tournamentOpen":
        idx = MAIL_RELAY_IDX
    elif emailTypeFlag == "MTinvite":
        idx = OBG_MAILER_IDX
    elif emailTypeFlag == "yourTurn":
        counter = 0
        try:
            with open("./Lobby/sharedFunctions/emailCounter.txt", "r+") as file:
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
            idx = MAIL_RELAY_IDX
        if counter > 1600:
            counter = 0
        # if counter > 675:
        #    idx = 0
        # if counter > 900:
        #    idx = 0

    # HARD CODE IDX HERE
    idx = MAIL_RELAY_IDX

    fromEmail = ADDRESSES[idx]
    # Validate and assert password type
    fromPassword = PASSWORDS[idx]
    if not isinstance(fromPassword, str) or not fromPassword:
        raise ValueError(f"Invalid or empty password for key: {idx}")
    loginUsername = LOGINS[idx]
    serverAddress = SERVERS[idx]

    if settings.LOCAL_USER:
        user = User.objects.get(email=toEmail)
        user.email_user(subject, message)
    else:
        msg = MIMEMultipart()
        msg["From"] = fromEmail
        msg["To"] = toEmail
        msg["Subject"] = subject
        msg.attach(MIMEText(message, "html"))
        server = smtplib.SMTP(serverAddress, 587)
        server.starttls()
        server.login(loginUsername, fromPassword)
        server.send_message(msg)
        server.quit()


def SN_sendWebhooks(profile, messageText, urlText, urlRaw):
    if profile.webhooks == "" or profile.webhooks is None or profile.webhooks == "[]":
        return

    webhooks = json.loads(profile.webhooks)
    for webhookData in webhooks:
        # Discord
        if webhookData[0] == "DC":
            discordMessage = ""
            if webhookData[2] != "":
                discordMessage += "<@" + webhookData[2] + ">\n"
            discordMessage += f"{messageText}\n[{urlText}]({urlRaw})"
            requests.post(webhookData[1], data={"content": discordMessage})
        # Slack
        if webhookData[0] == "SL":
            slackMessage = f"{messageText}\n<{urlRaw}|{urlText}>"
            if webhookData[2] != "":
                message = gettext("This is a test message from Online Board Gamers")
                slackMessage = f"<@{webhookData[2]}>\n{slackMessage}"
            requests.post(webhookData[1], json.dumps({"text": slackMessage}))
        # Telegram
        if webhookData[0] == "TG":
            TOKEN = config("TELEGRAM_OBG_BOT_TOKEN")
            telegramMessage = f"{messageText}\n<a href='{urlRaw}'>{urlText}</a>"
            # message = "This is a test message from <b>Online Board Gamers</b> <a href='https://www.onlineboardgamers.com/profile/'>Click here to go to url</a>"
            # encoded_message = urllib.parse.quote_plus(message, safe=':/')
            encoded_telegramMessage = urllib.parse.quote(telegramMessage, safe=":/")
            url = f"https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={webhookData[2]}&text={encoded_telegramMessage}&parse_mode=HTML"
            requests.post(url)


def SN_sendAdminErrorMessage(request, message):
    try:
        requests.post(
            f"https://discord.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
            data={"content": message},
        )
    except Exception as e:
        print("sendAdminErrorMessage ERROR: " + str(e))
