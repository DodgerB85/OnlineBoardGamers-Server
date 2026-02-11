#### THESE ITEMS SHOULD BE "PURE" AND INDEPENDENT OF ANY MODELS

import json
import time
import copy
import math
from django.utils.translation import gettext, gettext_lazy
from collections import Counter

DISCORD = "DC"
SLACK = "SL"
TELEGRAM = "TG"
OTHER = "OT"

def SR_usesUnifiedGameModel(game_code):
    """
    Returns True if the game uses the unified Game model with GamePlayer relationships.
    Returns False if the game uses the legacy model with M2M relationships.

    As games are migrated to the unified model, add their game codes here.
    """
    return game_code in ["CNS", "WEB", "AQY", "TGZ", "IND", "Bus"]

SR_GAMES_CODES_AND_NAMES_CHOICES = [
    ("FCM", gettext_lazy("Food Chain Magnate")),
    ("HC", gettext_lazy("Horseless Carriage")),
    ("Bus", gettext_lazy("Bus")),
    ("TGZ", gettext_lazy("The Great Zimbabwe")),
    ("CNS", gettext_lazy("Cannes")),
    ("AQY", gettext_lazy("Antiquity")),
    ("IND", gettext_lazy("Indonesia")),
    ("KFW", gettext_lazy("Keyflower")),
    ("WEB", gettext_lazy("Web")),
    ("RNB", gettext_lazy("Roads & Boats")),
]

SR_WEBHOOK_CHOICES = {
    DISCORD: gettext_lazy("Discord"),
    SLACK: gettext_lazy("Slack"),
    TELEGRAM: gettext_lazy("Telegram"),
    OTHER: gettext_lazy("Other"),
}


OPEN = "OP"
PRIVATE = "PR"
IN_PROGRESS = "IP"
FINISHED = "FN"

SR_TOURNAMENT_STATUS_CHOICES = [
    (OPEN, gettext_lazy("Open")),
    (PRIVATE, gettext_lazy("Private")),
    (IN_PROGRESS, gettext_lazy("In Progress")),
    (FINISHED, gettext_lazy("Finished")),
]

ROUNDS = "RR"
KNOCKOUT = "KO"
TWO_LIVES = "TL"
POINTS = "PT"
MULTI_GAME = "MG"

SR_TOURNAMENT_TYPE_CHOICES = [
    (ROUNDS, gettext_lazy("Rounds")),
    (KNOCKOUT, gettext_lazy("Knockout")),
    (TWO_LIVES, gettext_lazy("Two Lives")),
    (POINTS, gettext_lazy("Points")),
    (MULTI_GAME, gettext_lazy("Multi Game")),
]


def SR_getTournamentTypeDisplay(value):
    for choice_value, choice_display in SR_TOURNAMENT_TYPE_CHOICES:
        if choice_value == value:
            return str(choice_display)  # Convert lazy translation to string
    return value  # Fallback to value if not found


SR_GAME_STATUS_CHOICES = [
    ("AVAILABLE", "AVAILABLE"),
    ("WAITING", "WAITING"),
    ("PRIVATE", "PRIVATE"),
    ("ACTIVE", "ACTIVE"),
    ("FINISHED", "FINISHED"),
]


def SR_getTimeNow():
    return str(int(time.time()) * 1000)


def SR_isThisMultiiWinnersGame(_gameCode):
    if _gameCode == "KFW" or _gameCode == "AQY":
        return True
    return False


def SR_getTournamentWinnerHTML(tournamentStatus, winnersData):
    winnerHTML = ""
    if tournamentStatus == "OP":
        return "[ " + gettext("OPEN FOR SIGNUP") + " ]"
    if tournamentStatus == "IP":
        return "[ " + gettext("In Progress") + " ]"
    if winnersData:
        winnersData = json.loads(winnersData)
        winnerHTML = "<B>" + gettext("1st:") + " </B>"
        for index, player in enumerate(winnersData[0]):
            winnerHTML += '<B><a href="/profile/' + player + '">' + player + "</a></B>"
            if index + 1 != len(winnersData[0]):
                winnerHTML += ", "
        if len(winnersData) >= 2:
            winnerHTML += "<BR/><B>" + gettext("2nd:") + " </B>"
            for index, player in enumerate(winnersData[1]):
                winnerHTML += '<a href="/profile/' + player + '">' + player + "</a>"
                if index + 1 != len(winnersData[1]):
                    winnerHTML += ", "
        if len(winnersData) >= 3 and len(winnersData[2]) > 0:
            winnerHTML += "<BR/><B>" + gettext("3rd:") + " </B>"
            for index, player in enumerate(winnersData[2]):
                winnerHTML += '<a href="/profile/' + player + '">' + player + "</a>"
                if index + 1 != len(winnersData[2]):
                    winnerHTML += ", "

    return winnerHTML


######################################
#
#   General / All TOURNAMENTS
#
######################################
def getCleanedAndSortedRoundData(roundData):
    playersData = []
    for row in roundData:
        name, played, wins = row[0], row[1], row[2]
        tb = sorted(row[3:], reverse=True)  # sort existing TBs descending
        tb += [[-float("inf"), -1]] * (4 - len(tb))  # pad if needed (optional)
        normalized_row = [name, played, wins] + tb[:4]  # keep only top 4
        playersData.append(normalized_row)

    playersData.sort(key=lambda r: (-r[2], -r[3][0], -r[4][0], -r[5][0], -r[6][0], r[0]))

    # Now remove the -inf's
    cleaned = []
    for row in playersData:
        # Keep only elements that are not ±inf
        # clean_row = [x for x in row if x == x and  x[0] != float('inf') and x[0] != -float('inf')]
        clean_row = [
            item
            for item in row
            if not (isinstance(item, list) and len(item) > 0 and math.isinf(item[0]) and item[0] < 0)
        ]
        # Alternative (shorter): row[:3] + [x for x in row[3:] if x != -float('inf')]
        cleaned.append(clean_row)
    return cleaned


# Return an array of subarrays, in the form [name (lives IF NEEDED), poitns]
def SR_getAnyTournamentPlayersData(tournament):
    # Handle MG first, as this has players in rounds instead of just once
    if tournament.tournamentType == "MG":

        ######## START OF MAIN FUNCTION
        ret = {}
        allMGdata = []

        tournamentPointsData = json.loads(tournament.tournamentPointsData)
        for i, round in enumerate(tournamentPointsData):
            # Create a new table data array
            roundData = []
            playersData = []
            roundData.append(["Round " + str(i + 1)])
            if i == 0:
                roundData.append(["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"])

                cleanedData = getCleanedAndSortedRoundData(round)
                playersData = cleanedData

                roundData.append(playersData)  # this already appends as an array
                allMGdata.append(roundData)
            elif i == 1:
                # Group A is first 7 rows
                groupA = round[:7]
                groupB = round[7:]
                groupData = [[], []]
                # groupData.append(["Group A"])
                groupData[0].append(["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"])
                groupData[0].append(getCleanedAndSortedRoundData(groupA))
                # groupData.append(["Group B"])
                groupData[1].append(["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"])
                groupData[1].append(getCleanedAndSortedRoundData(groupB))
                roundData.append(groupData)
                allMGdata.append(roundData)
            elif i == 2:
                roundData.append(["Player", "Played", "Won", "TB1"])
                cleanedData = getCleanedAndSortedRoundData(round)
                playersData = cleanedData

                roundData.append(playersData)  # this already appends as an array
                allMGdata.append(roundData)

        allMGdata.reverse()
        ret["allMGdata"] = allMGdata
        return ret

    sideData = []
    if tournament.tournamentType == "TL":
        sideData = json.loads(tournament.tournamentSideData)
        # TL_sideData = Counter(sideData)

    pointsList = (
        sorted(json.loads(tournament.tournamentPointsData), key=lambda x: -x[1])
        if tournament.tournamentPointsData != ""
        else []
    )
    ret = {}
    headingRow = ["Player", "Points"]
    if tournament.tournamentType == "TL":
        headingRow = ["Player (Lives)", "Points"]

    ret["headingRow"] = headingRow
    playersData = []

    for name, points in pointsList:
        rawName = name
        if tournament.tournamentType == "TL":
            lives = 0
            for subarr in sideData:
                if subarr[0] == rawName:
                    lives = subarr[1]
            if len(name) >= 12:
                name = name[:10] + "..."
            name = name + " (" + str(lives) + ")"
        # Include raw name to allow linking the row to the profile
        playersData.append([name, points, rawName])
    ret["playerData"] = playersData
    return ret


def SR_getAnyTournamentRoundsData(tournament):
    TPDA = json.loads(tournament.tournamentProgressionData)
    ret = []
    for i in range(len(TPDA)):
        currentRound = {}
        gamesData = []  # .Players, .gameID, .winner
        roundTitle = gettext("Round") + " " + str(i + 1)
        if tournament.tournamentType == "RR" and i >= tournament.roundsBeforeKnockout:
            roundTitle += " (KO)"
        currentRound["roundTitle"] = roundTitle

        for row in TPDA[i]:
            if row[0] == "BYEPLAYERS":
                currentRound["byesNames"] = row[1:]
            else:
                # winner = row[2][0] if len(row[2]) > 0 else []
                currentGame = {}
                currentGame["players"] = row[0]
                currentGame["gameID"] = row[1]
                currentGame["winnersArr"] = row[2]
                if len(row) >= 4:
                    currentGame["gameName"] = row[3]
                else:
                    currentGame["gameName"] = "[no name]"
                gamesData.append(currentGame)
        currentRound["gamesData"] = gamesData
        # ret.insert(0, currentRound)
        ret.append(currentRound)

    # Reverse it so most recent round data is at the top for MG
    if tournament.tournamentType == "MG":
        ret.reverse()
    return ret


######################################################


def SR_getTournamentRoundsHTML(
    tournamentType, maxGamePlayers, tournamentProgressionData, tournamentPointsData, gameTypeString, tournamentObj
):
    TPDA = json.loads(tournamentProgressionData)

    roundsHTML = '<div id="tournamentRoundsContainerDiv">'
    pointsList = sorted(json.loads(tournamentPointsData), key=lambda x: -x[1]) if tournamentPointsData != "" else []
    TL_sideData = []
    if tournamentType == "TL":
        sideData = json.loads(tournamentObj.tournamentSideData)
        TL_sideData = Counter(sideData)

    if len(pointsList) > 0:
        roundsHTML += '<div class="playerInfoStatsContainer tournyRoundDiv">'
        if tournamentType == "RR":
            roundsHTML += "<h2>" + gettext("Points") + "</h2>"
        elif tournamentType == "TL":
            roundsHTML += "<h2>" + gettext("Points (Lives)") + "</h2>"
        roundsHTML += '<div class="playerStatsDiv">'
        roundsHTML += '<table class="generalTable">'
        for i in range(len(pointsList)):
            roundsHTML += "<tr>"
            if tournamentType == "RR":
                roundsHTML += "<th>" + pointsList[i][0] + "</th>"
            elif tournamentType == "TL":
                # fullyCompletedRounds = len(TPDA) - 1
                # hasCompletedThisRound = pointsList[i][0] in tournamentObj.nextRoundPlayers.all().values_list("username", flat=True)
                # if hasCompletedThisRound:
                #    fullyCompletedRounds += 1
                # lives = 2 - fullyCompletedRounds + pointsList[i][1]
                lives = TL_sideData[pointsList[i][0]] if pointsList[i][0] in TL_sideData else 0
                roundsHTML += "<th>" + pointsList[i][0] + " (" + str(lives) + ")</th>"
            roundsHTML += "<th>" + str(pointsList[i][1]) + "</th>"
            roundsHTML += "</tr>"

        roundsHTML += "</table>"
        roundsHTML += "</div>"
        roundsHTML += "</div>"

    for i in range(len(TPDA)):
        roundsTitle = str(i + 1)
        if tournamentType == "RR" and i >= 4:
            roundsTitle += " (KO)"
        roundsHTML += '<div class="playerInfoStatsContainer tournyRoundDiv">'
        roundsHTML += "<h2>" + gettext("Round") + " " + roundsTitle + "</h2>"
        roundsHTML += '<div class="playerStatsDiv">'
        roundsHTML += '<table class="generalTable">'
        roundsHTML += "<tr>"
        roundsHTML += "<th>" + gettext("Game") + "</th>"
        roundsHTML += "<th>" + gettext("Winner") + "</th>"
        roundsHTML += "</tr>"

        for row in TPDA[i]:
            if row[0] != "BYEPLAYERS":
                roundsHTML += (
                    '<tr class="clickableGameRow ' + gameTypeString + '" id="gamesRow' + str(row[maxGamePlayers]) + '">'
                )
                j = 0
                for j in range(len(row)):
                    # Only add lives if 2L AND it is the latest round
                    if tournamentType == "TL" and i == len(TPDA) - 1:
                        lives = TL_sideData[row[j]] if row[j] in TL_sideData else 0
                        if j == 0:
                            roundsHTML += (
                                '<td><a href="/profile/' + row[j] + '">' + row[j] + " (" + str(lives) + ")</a>"
                            )
                        elif j < maxGamePlayers:
                            roundsHTML += (
                                ' VS <a href="/profile/' + row[j] + '">' + row[j] + " (" + str(lives) + ")</a>"
                            )
                    # Else just add the names
                    else:
                        if j == 0:
                            roundsHTML += '<td><a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                        elif j < maxGamePlayers:
                            roundsHTML += ' VS <a href="/profile/' + row[j] + '">' + row[j] + "</a>"

                roundsHTML += "</td>"
                roundsHTML += "<td>"
                if len(row) == (maxGamePlayers + 2) and j < len(row):
                    roundsHTML += row[j]
                roundsHTML += "</td>"

                roundsHTML += "</tr>"
        # Add byes to end of rounds HTML
        for row in TPDA[i]:
            if row[0] == "BYEPLAYERS":
                roundsHTML += "<tr>"
                for j in range(len(row)):
                    # Only add lives if 2L AND it is the latest round
                    if tournamentType == "TL" and i == len(TPDA) - 1:
                        lives = TL_sideData[row[j]] if row[j] in TL_sideData else 0
                        if j == 1:
                            roundsHTML += (
                                "<td>"
                                + gettext("BYES:")
                                + '<a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + " ("
                                + str(lives)
                                + ")</a>"
                            )
                        elif j > 1:
                            roundsHTML += ', <a href="/profile/' + row[j] + '">' + row[j] + " (" + str(lives) + ")</a>"
                    else:
                        if j == 1:
                            roundsHTML += (
                                "<td>" + gettext("BYES:") + ' <a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                            )
                        elif j > 1:
                            roundsHTML += ', <a href="/profile/' + row[j] + '">' + row[j] + "</a>"

        roundsHTML += "</table>"
        roundsHTML += "</div>"
        roundsHTML += "</div>"
    roundsHTML += "</div>"

    return roundsHTML


def SR_currentTurnString(game, turn, phase):
    if game == "FCM":
        currentTurnString = str(turn) + "."
        if phase == 13:
            currentTurnString = gettext("Setup - Draft Modules")
        if phase == 14:
            currentTurnString = gettext("Setup - Urban Planning")
        if phase == 0 or phase == 1:
            currentTurnString = gettext("Setup - Restaurants")
        if phase == 2:
            currentTurnString = gettext("Setup - Reserve Cards")
        if phase == 3:
            currentTurnString += gettext("1 - Restructuring")
        if phase == 4:
            currentTurnString += gettext("2 - Order of Business")
        if phase == 5:
            currentTurnString += gettext("3 - Working 9:00-5:00")
        if phase == 6:
            currentTurnString += gettext("4 - Dinnertime")
        if phase == 7:
            currentTurnString += gettext("5 - Payday")
        if phase == 8:
            currentTurnString += gettext("6 - Marketing Campaigns")
        if phase == 9:
            currentTurnString += gettext("7 - Clean up")
        if phase == 10:
            currentTurnString += gettext("Game End")
        if phase == 11:
            currentTurnString += gettext("4 - Pizza Milestone")
        if phase == 12:
            currentTurnString += gettext("7 - Coffee Shop Milestone")
        if phase == 15:
            currentTurnString += gettext("Choose CEO Bonus")
        return currentTurnString

    elif game == "HC":
        currentTurnString = str(turn) + "."
        if turn == 0:
            currentTurnString = gettext("Factory Setup")
        elif phase == 1:
            currentTurnString += gettext("1 - Research")
        elif phase == 2:
            currentTurnString += gettext("2 - Set Focus")
        elif phase == 3:
            currentTurnString += gettext("3 - Build Factory")
        elif phase == 4:
            currentTurnString += gettext("4 - Print Sales Brochures")
        elif phase == 5:
            currentTurnString += gettext("5 - Sell")
        elif phase == 6:
            currentTurnString += gettext("6 - Game End")
        elif phase == 7:
            currentTurnString += gettext("7 - Increase Expectations")
        elif phase == 8:
            currentTurnString += gettext("8 - Grow Demands")

        return currentTurnString

    elif game == "Bus":
        currentTurnString = str(turn)
        if phase == 0:
            currentTurnString += " - " + gettext("Setup Buildings")
        elif phase == 1:
            currentTurnString += " - " + gettext("Setup Lines")
        elif phase == 2:
            currentTurnString += "." + gettext("1 - Choose Actions")
        elif phase == 3:
            currentTurnString += "." + gettext("2 - Line Expansion")
        elif phase == 4:
            currentTurnString += "." + gettext("3 - Add a Bus")
        elif phase == 5:
            currentTurnString += "." + gettext("4 - Add Passengers")
        elif phase == 6:
            currentTurnString += "." + gettext("5 - Add Buildings")
        elif phase == 7:
            currentTurnString += "." + gettext("6 - Alter Time")
        elif phase == 8:
            currentTurnString += "." + gettext("7 - VRROOOMM!!")
        elif phase == 9:
            currentTurnString += "." + gettext("8 - Change Start Player")
        elif phase == 10:
            currentTurnString += "." + gettext("9 - Game End Check")
        elif phase == 11:
            currentTurnString += "." + gettext("10 - Game Finished")

        return currentTurnString

    elif game == "TGZ":
        currentTurnString = str(turn)
        if phase == 0:
            currentTurnString += " - " + gettext("Place First Monument")
        elif phase == 1:
            currentTurnString += " - " + gettext("The Generosity Of Kings")
        elif phase == 2:
            currentTurnString += " - " + gettext("Religion & Culture")
        elif phase == 3:
            currentTurnString += " - " + gettext("Revenues")
        elif phase == 4:
            currentTurnString += " - " + gettext("Let us compare mythologies")
        elif phase == 5:
            currentTurnString += " - " + gettext("We have found the best mythology")
        return currentTurnString

    elif game == "CNS":
        if phase == 2:
            return gettext("Turn") + " " + str(turn) + " - " + gettext("Production")
        if phase == 4:
            return gettext("Turn") + " " + str(turn) + " - " + gettext("Move Pirates")
        return gettext("Turn") + " " + str(turn)

    elif game == "AQY":
        currentTurnString = str(turn)
        if phase == 0:
            currentTurnString += " - " + gettext("Place First City")
        elif phase == 1:
            currentTurnString += "." + gettext("All Rise")
        elif phase == 2:
            currentTurnString += "." + gettext("City Building")
        elif phase == 3:
            currentTurnString += "." + gettext("Turn Order")
        elif phase == 4:
            currentTurnString += "." + gettext("Countryside Building")
        elif phase == 5:
            currentTurnString += "." + gettext("Storage")
        elif phase == 6:
            currentTurnString += "." + gettext("Harvest")
        elif phase == 7:
            currentTurnString += "." + gettext("Explore")
        elif phase == 8:
            currentTurnString += "." + gettext("Famine")
        elif phase == 9:
            currentTurnString += "." + gettext("Pollution")
        elif phase == 10:
            currentTurnString += "." + gettext("Game End Check")
        elif phase == 11:
            currentTurnString += "." + gettext("Game End")
        return currentTurnString

    elif game == "IND":
        currentTurnString = str(turn)
        if phase == 0:
            currentTurnString += "." + gettext("New Era")
        elif phase == 1:
            currentTurnString += "." + gettext("Turn Order Bidding")
        elif phase == 2:
            currentTurnString += "." + gettext("Mergers")
        elif phase == 3:
            currentTurnString += "." + gettext("Merger Bidding")
        elif phase == 4:
            currentTurnString += "." + gettext("Siap Faji Merger")
        elif phase == 5:
            currentTurnString += "." + gettext("Acquisitions")
        elif phase == 6:
            currentTurnString += "." + gettext("R & D")
        elif phase == 7:
            currentTurnString += "." + gettext("Operations")
        elif phase == 8:
            currentTurnString += "." + gettext("City Growth")
        elif phase == 9:
            currentTurnString += "." + gettext("Game End")
        return currentTurnString

    elif game == "KFW":
        currentTurnString = gettext("Winter")
        if turn == 0:
            currentTurnString = gettext("Spring")
        elif turn == 1:
            currentTurnString = gettext("Summer")
        elif turn == 2:
            currentTurnString = gettext("Autumn")
        elif turn == 3:
            currentTurnString = gettext("Winter")

        if phase == 0:
            currentTurnString += " - " + gettext("Bidding & Actions")
        elif phase == 1:
            currentTurnString += " - " + gettext("Collect Boat Resources")
        elif phase == 2:
            currentTurnString += " - " + gettext("Village Expansion")
        elif phase == 3:
            currentTurnString += " - " + gettext("Choose Winter Tiles")
        elif phase == 4:
            currentTurnString += " - " + gettext("Final Scoring")
        elif phase == 5:
            currentTurnString += " - " + gettext("Game End")
        if phase == 6:
            currentTurnString += " - " + gettext("Bidding & Actions-B")
        if phase == 7:
            currentTurnString += " - " + gettext("Bidding & Actions-B")

        return currentTurnString

    elif game == "WEB":
        currentTurnString = gettext("Turn") + " - " + str(turn)
        return currentTurnString

    return "NO CURRENT TURN STRING"


def SR_gamePaceString(gamePace):
    gamePaceString = ""
    if gamePace == 10:
        gamePaceString = gettext("Live")
    if gamePace == 20:
        gamePaceString = gettext("Fast<br/>(Several moves/day)")
    if gamePace == 30:
        gamePaceString = gettext("Standard<br/>(1-2+ moves/day)")
    if gamePace == 40:
        gamePaceString = gettext("Slow<br/>(1 move/day)")
    if gamePace == 50:
        gamePaceString = gettext("Casual")
    return gamePaceString


#def SR_getKickoutHTML(kickoutDuration):
#    HTML = ""
#    # less than a day kickouts
#    kickoutInDays = int(kickoutDuration / 100)
#    if kickoutDuration < 49:
#        if kickoutDuration == 5:
#            HTML = (
#                "<img class ='startingOption' src='/static/Lobby/images/kickout5.svg' title='"
#                + gettext("Kickout after 5 Minutes")
#                + "'/>"
#            )
#        elif kickoutDuration == 10:
#            HTML = (
#                "<img class ='startingOption' src='/static/Lobby/images/kickout10.svg' title='"
#                + gettext("Kickout after 10 Minutes")
#                + "'/>"
#            )
#        elif kickoutDuration == 20:
#            HTML = (
#                "<img class ='startingOption' src='/static/Lobby/images/kickout20.svg' title='"
#                + gettext("Kickout after 20 Minutes")
#                + "'/>"
#            )
#
#    elif kickoutDuration == 50:
#        HTML = (
#            "<img class ='startingOption' src='/static/Lobby/images/kickout50.svg' title='"
#            + gettext("Kickout after 12 Hours")
#            + "'/>"
#        )
#    elif kickoutDuration == 100:
#        HTML = (
#            "<img class ='startingOption' src='/static/Lobby/images/kickout100.svg' title='"
#            + gettext("Kickout after 1 day")
#            + "'/>"
#        )
#    else:
#        kickoutTitle = gettext("Kickout after %(kickoutInDays)s days") % {"kickoutInDays": str(kickoutInDays)}
#        HTML = (
#            "<img class ='startingOption' src='/static/Lobby/images/kickout"
#            + str(kickoutDuration)
#            + ".svg' title='"
#            + kickoutTitle
#            + "'/>"
#        )
#    return HTML


def SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds):
    elapsedDays = elapsedTotalSeconds // (60 * 60 * 24)
    elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60 * 24)
    elapsedHours = elapsedTotalSeconds // (60 * 60)
    elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60)
    elapsedmins = elapsedTotalSeconds // (60)
    elapsedTotalSeconds = elapsedTotalSeconds % (60)

    latestUpdateElapsedTimeString = ""
    if elapsedDays > 0:
        latestUpdateElapsedTimeString += str(elapsedDays) + "d"
        # if (elapsedDays > 1): latestUpdateElapsedTimeString += "s"

    if elapsedHours > 0:
        latestUpdateElapsedTimeString += " " + str(elapsedHours) + "h"
        # if (elapsedHours > 1): latestUpdateElapsedTimeString += "s"
    if elapsedmins > 0:
        latestUpdateElapsedTimeString += " " + str(elapsedmins) + "m"
    latestUpdateElapsedTimeString += " " + str(elapsedTotalSeconds) + "s"
    return latestUpdateElapsedTimeString


def SR_getFCMstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return "[None]"
    if len(startingOptionsArr) == 0:
        return "[None]"
    
    # Reorder Options to have a better order
    startingOptionsList = []
    if 110 in startingOptionsArr:
        startingOptionsList.append(110)  # learning Game
    if 120 in startingOptionsArr:
        startingOptionsList.append(120)  # Experienced Game
    if 5 in startingOptionsArr:
        startingOptionsList.append(5)  # Allow Surrender
    if 1 in startingOptionsArr:
        startingOptionsList.append(1)  # Short Game
    if 2 in startingOptionsArr:
        startingOptionsList.append(2)  # No MS
    if 3 in startingOptionsArr:
        startingOptionsList.append(3)  # No CEO
    if 6 in startingOptionsArr:
        startingOptionsList.append(6)  # No Radio
    if 8 in startingOptionsArr:
        startingOptionsList.append(8)  # Hard Choices
    if 21 in startingOptionsArr:
        startingOptionsList.append(21)  # New MS
    if 20 in startingOptionsArr:
        startingOptionsList.append(20)  # Ketchup MS (-1 dist)
    if 23 in startingOptionsArr:
        startingOptionsList.append(23)  # New Reserve
    if 14 in startingOptionsArr:
        startingOptionsList.append(14)  # Movie Stars
    if 15 in startingOptionsArr:
        startingOptionsList.append(15)  # Mass Marketers
    if 13 in startingOptionsArr:
        startingOptionsList.append(13)  # Gourmet Food Critics
    if 17 in startingOptionsArr:
        startingOptionsList.append(17)  # Rural Marketer
    if 18 in startingOptionsArr:
        startingOptionsList.append(18)  # New Districts
    if 22 in startingOptionsArr:
        startingOptionsList.append(22)  # Lobbyists
    if 16 in startingOptionsArr:
        startingOptionsList.append(16)  # NightShift
    if 19 in startingOptionsArr:
        startingOptionsList.append(19)  # Cofffee
    if 9 in startingOptionsArr:
        startingOptionsList.append(9)  # Fry Chef
    if 10 in startingOptionsArr:
        startingOptionsList.append(10)  # Kimchi
    if 11 in startingOptionsArr:
        startingOptionsList.append(11)  # Sushi
    if 12 in startingOptionsArr:
        startingOptionsList.append(12)  # Noodles
    if 101 in startingOptionsArr:
        startingOptionsList.append(101)  # Strict Pay / Fridge
    if 200 in startingOptionsArr:
        startingOptionsList.append(200)  # Random Mods
    if 300 in startingOptionsArr:
        startingOptionsList.append(300)  # Draft Mods
    if 999 in startingOptionsArr:
        startingOptionsList.append(999)  # Skip Module
    if 103 in startingOptionsArr:
        startingOptionsList.append(103)  # Sandbox Mode
    if 40 in startingOptionsArr:
        startingOptionsList.append(40)  # Urabn Planning
    if 41 in startingOptionsArr:
        startingOptionsList.append(41)  # Urabn Planning Plus
    if 42 in startingOptionsArr:
        startingOptionsList.append(42)  # jazz
    if 43 in startingOptionsArr:
        startingOptionsList.append(43)  # dumpling
    if 44 in startingOptionsArr:
        startingOptionsList.append(44)  # delivery
    if 45 in startingOptionsArr:
        startingOptionsList.append(45)  # hawker
    # 99 is used to allow rewinds in mini tournaments

    # startingOptionsHTML = "<div>"
    startingOptionsHTML = ""
    # usedOptions = 0
    for option in startingOptionsList:
        # if option == 5:
        #    #usedOptions += 1
        #    startingOptionsHTML += "<img class ='startingOption' src='/static/FCM/images/so_surrender.svg' title='Allow Surrender'>"
        if option == 1:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_shortGame.svg' title='"
                + gettext("Short Game")
                + "'>"
            )
        if option == 2:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_noMS.svg' title='"
                + gettext("No Milestones")
                + "'>"
            )
        if option == 3:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_noCEO.svg' title='"
                + gettext("No CFO Milestone")
                + "'>"
            )
        if option == 6:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_noRadio.svg' title='"
                + gettext("No Radio Milestone")
                + "'>"
            )
        if option == 8:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/hardchoices2.jpg' title='"
                + gettext("Hard Choices")
                + "'>"
            )
        if option == 21:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_newMS.svg' title='"
                + gettext("New Milestones")
                + "'>"
            )
        if option == 20:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_ketchupMS.svg' title='"
                + gettext("Ketchup Milestone")
                + "'>"
            )
        if option == 23:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_reservePrice.jpg' title='"
                + gettext("New Reserve Cards")
                + "'>"
            )
        if option == 14:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_movieStars.svg' title='"
                + gettext("Movie Stars")
                + "'>"
            )
        if option == 15:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_massMarketeers.jpg' title='"
                + gettext("Mass Marketeers")
                + "'>"
            )
        if option == 13:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_GFC.jpg' title='"
                + gettext("Gourmet Food Critics")
                + "'>"
            )
        if option == 17:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_rural.jpg' title='"
                + gettext("Rural Marketeers")
                + "'>"
            )
        if option == 18:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/map23.jpg' title='"
                + gettext("New Districts")
                + "'>"
            )
        if option == 22:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_lobbyists.jpg' title='"
                + gettext("Lobbyists")
                + "'>"
            )
        if option == 16:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_nightShift.jpg' title='"
                + gettext("Night Shift Manager")
                + "'>"
            )
        if option == 19:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_coffee.svg' title='" + gettext("Coffee") + "'>"
            )
        if option == 9:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_fryChef.svg' title='"
                + gettext("Fry Chef")
                + "'>"
            )
        if option == 10:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_kimchi.svg' title='" + gettext("Kimchi") + "'>"
            )
        if option == 11:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_sushi.svg' title='" + gettext("Sushi") + "'>"
            )
        if option == 12:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_noodles.svg' title='"
                + gettext("Noodles")
                + "'>"
            )
        if option == 40:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_urbanPlanning.svg' title='"
                + gettext("Urban Planning")
                + "'>"
            )
        if option == 41:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_urbanPlanningPlus.svg' title='"
                + gettext("Urban Planning Plus")
                + "'>"
            )
        if option == 42:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_jazz.svg' title='"
                + gettext("Jazz Musicians")
                + "'>"
            )
        if option == 43:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_dumplings.svg' title='"
                + gettext("Dumplings")
                + "'>"
            )
        if option == 44:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_delivery.svg' title='"
                + gettext("Delivery Drivers")
                + "'>"
            )
        if option == 45:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_hawkers.svg' title='"
                + gettext("Hawker Marketeers")
                + "'>"
            )
        if option == 101:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_strict.svg' title='"
                + gettext("Turn Order Payday/Fridge")
                + "'>"
            )
        if option == 200:
            # usedOptions += 1
            moduleRange = []
            for i in range(len(startingOptionsArr)):
                if startingOptionsArr[i] > 21000 and startingOptionsArr[i] < 21116:
                    numStr = str(startingOptionsArr[i] % 100)
                    moduleRange.append(numStr[-2:])
            if len(moduleRange) != 2:
                moduleRange = ["??", "??"]
            # for i in range(len(moduleRange)): moduleRange[i] = int(moduleRange[i][-2:])
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_randomMods.svg' title='"
                + moduleRange[0]
                + " - "
                + moduleRange[1]
                + " "
                + gettext("Random Modules")
                + "'>"
            )
        if option == 300:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_draftMods.jpg' title='"
                + gettext("Draft Modules")
                + "'>"
            )

        if option == 999:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_skip.jpg' title='"
                + gettext("Skip Module")
                + "'>"
            )

        if option == 103:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/FCM/images/so_sandbox.svg' title='"
                + gettext("Sandbox Mode")
                + "'>"
            )
        if option == 110:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        if option == 120:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )
        # if (usedOptions+1) % 7 == 0:
        #    startingOptionsHTML += "<BR/>"
    # startingOptionsHTML += "</div>"
    # if startingOptionsHTML == "": startingOptionsHTML = "[None]"
    if startingOptionsHTML == "":
        startingOptionsHTML = "[None]"

    return startingOptionsHTML


def SR_getTGZstartingOptionsHTML(startingOptionsArr):
    if startingOptionsArr == "":
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    if startingOptionsArr[0] == 102:
        del startingOptionsArr[0]
    if len(startingOptionsArr) == 0:
        return ""
    # Now you have an array of 1 or 2 length, with [0] being gods, OR schism
    requiresHTML = False
    customgods = []
    customVR = []
    specVR = []
    for index, entry in enumerate(startingOptionsArr):
        if isinstance(entry, list) and len(entry) > 0 and entry[0] == 90:
            requiresHTML = True
            customgods = copy.deepcopy(entry)  # Make a copy of the entry array
        elif isinstance(entry, list) and len(entry) > 0 and entry[0] == 91:
            requiresHTML = True
            customVR = copy.deepcopy(entry)  # Make a copy of the entry array
        elif isinstance(entry, list) and len(entry) > 0 and entry[0] == 92:
            requiresHTML = True
            specVR = copy.deepcopy(entry)  # Make a copy of the entry array
        elif entry == 110 or entry == 120:
            requiresHTML = True
        #
        elif entry == 7 or entry == 8 or entry == 9:
            requiresHTML = True

    if not requiresHTML:
        return ""

    retHTML = ""
    if 7 in startingOptionsArr:
        retHTML += (
            "<img class='startingOption' src='/static/TGZ/images/so_schism.svg' title='"
            + gettext("Use Schism Expansion - Random Mix")
            + "'>"
        )
    if 8 in startingOptionsArr:
        retHTML += (
            "<img class='startingOption' src='/static/TGZ/images/so_schism.svg' title='"
            + gettext("Use Schism Expansion - 4/4 Mix")
            + "'>"
        )
    if 9 in startingOptionsArr:
        retHTML += (
            "<img class='startingOption' src='/static/TGZ/images/so_schism.svg' title='"
            + gettext("Use Schism Expansion - All SChism")
            + "'>"
        )
    if len(customgods) > 0 or len(customVR) > 0:
        retHTML += "<div class='TGZinfoContainer'>"
        if len(customVR) > 0:
            retHTML += (
                "<img class ='startingOption' src='/static/TGZ/images/so_customgodsVR.jpg' title='"
                + gettext("Custom gods and Specs VR")
                + "'>"
            )
        elif len(customgods) > 0:
            retHTML += (
                "<img class='startingOption TGZinfoIcon' src='/static/TGZ/images/so_customgods.jpg' title='"
                + gettext("Custom gods")
                + "'>"
            )
        if len(specVR) > 0:
            retHTML += (
                "<img class ='startingOption' src='/static/TGZ/images/so_customSpecVR.jpg' title='"
                + gettext("Custom Spec VR")
                + "'>"
            )

        retHTML += "<div class='TGZinfoPopup'>"
        retHTML += SR_getgodsVRoptionsHTML(startingOptionsArr)
        retHTML += "</div></div>"
    if 110 in startingOptionsArr:
        retHTML += (
            "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
            + gettext("Learning Game")
            + "'>"
        )
    elif 120 in startingOptionsArr:
        retHTML += (
            "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
            + gettext("Experienced Game")
            + "'>"
        )

    return retHTML


def SR_getgodsVRoptionsHTML(startingOptionsArr):
    customgods = []
    customVR = []
    specVR = []

    for entry in startingOptionsArr:
        if isinstance(entry, list) and entry:
            if entry[0] == 90:
                customgods.extend(entry)
            elif entry[0] == 91:
                customVR.extend(entry)
            elif entry[0] == 92:
                specVR.extend(entry)

    retHTML = ""
    gods = 1  # Start checking customVR at 1, because entry [0] is 91

    god_mapping = {
        0: {"name": "Shadipinyi", "imageName": "g_shadipinyi.jpg", "baseVR": 4},
        1: {"name": "Elegua", "imageName": "g_elegua.jpg", "baseVR": 4},
        2: {"name": "Dziva", "imageName": "g_dziva.jpg", "baseVR": 2},
        3: {"name": "Eshu", "imageName": "g_eshu.jpg", "baseVR": 4},
        4: {"name": "Gu", "imageName": "g_gu.jpg", "baseVR": 4},
        5: {"name": "Obatala", "imageName": "g_obatala.jpg", "baseVR": 7},
        6: {"name": "Atete", "imageName": "g_atete.jpg", "baseVR": 5},
        7: {"name": "Tsui-Goab", "imageName": "g_tg.jpg", "baseVR": 3},
        8: {"name": "Anansi", "imageName": "g_anansi.jpg", "baseVR": 5},
        9: {"name": "Qamata", "imageName": "g_qamata.jpg", "baseVR": 2},
        10: {"name": "Engai", "imageName": "g_engai.jpg", "baseVR": 5},
        11: {"name": "Xango", "imageName": "g_xango.jpg", "baseVR": -2},
        # Schism
        12: {"name": "AgwuNsi", "imageName": "g_agwunsi.jpg", "baseVR": 5},
        13: {"name": "Aja", "imageName": "g_aja.jpg", "baseVR": 3},
        14: {"name": "Aje_Shaluga", "imageName": "g_aje_shaluga.jpg", "baseVR": 4},
        15: {"name": "Alajire", "imageName": "g_alajire.jpg", "baseVR": 2},
        16: {"name": "Anyanwu", "imageName": "g_anyanwu.jpg", "baseVR": 12},
        17: {"name": "Ekwensu", "imageName": "g_ekwensu.jpg", "baseVR": 3},
        18: {"name": "Ogun", "imageName": "g_ogun.jpg", "baseVR": 3},
        19: {"name": "Ovia", "imageName": "g_ovia.jpg", "baseVR": 4},
        20: {"name": "Oya", "imageName": "g_oya.jpg", "baseVR": 6},
        21: {"name": "Simbi", "imageName": "g_simbi.jpg", "baseVR": 2},
        22: {"name": "Tiurakh", "imageName": "g_tiurakh.jpg", "baseVR": 7},
        23: {"name": "Yemoja", "imageName": "g_yemoja.jpg", "baseVR": 4},
        # Leftovers
        24: {"name": "Nyami_Nyami", "imageName": "g_nyami_nyami.jpg", "baseVR": 2},
        25: {"name": "Olokun", "imageName": "g_olokun.jpg", "baseVR": 2},
        26: {"name": "Olokun", "imageName": "g_olokun.jpg", "baseVR": 2},
        27: {"name": "Olokun", "imageName": "g_olokun.jpg", "baseVR": 2},
        28: {"name": "Olokun", "imageName": "g_olokun.jpg", "baseVR": 2},
        29: {"name": "Olokun", "imageName": "g_olokun.jpg", "baseVR": 2},
    }

    for index in range(30):
        if index in customgods:
            if index <= 11:
                retHTML += f"<div class='godAndVRdiv'><img class='godOptionImg' src='/static/TGZ/images/{god_mapping[index]['imageName'].lower()}' title='{gettext(god_mapping[index]['name'])}'/>"
            else:
                retHTML += f"<div class='godAndVRdiv'><img class='godOptionImg' src='/static/TGZ/images/expansion/{god_mapping[index]['imageName'].lower()}' title='{gettext(god_mapping[index]['name'])}'/>"

            if customVR and customVR[gods] != god_mapping[index]["baseVR"]:
                retHTML += f"<br/><div class='diffVR'>VR: {customVR[gods]}</div>"
            retHTML += "</div>"
            gods += 1
            if gods == 5:
                retHTML += "<br/>"

    specVR_mapping = {
        1: {"name": "Herd", "imageName": "s_herd.jpg", "baseVR": 6},
        2: {"name": "Nomads", "imageName": "s_nomads.jpg", "baseVR": 1},
        3: {"name": "Rain Ceremony", "imageName": "s_rain_ceremony.jpg", "baseVR": 1},
        4: {"name": "Shaman", "imageName": "s_shaman.jpg", "baseVR": 3},
        5: {"name": "Builder", "imageName": "s_builder.jpg", "baseVR": 2},
    }
    if retHTML != "":
        retHTML += "<br/><br/>"
    for i in range(1, 6):
        if specVR and specVR[i] != specVR_mapping[i]["baseVR"]:
            retHTML += f"<div class='godAndVRdiv'><img class='godOptionImg' src='/static/TGZ/images/{specVR_mapping[i]['imageName']}' title='{gettext(specVR_mapping[i]['name'])}'>"
            retHTML += f"<br/><span class='diffVR'>VR: {specVR[i]}</span>"
            retHTML += "</div>"

    return retHTML


def SR_getCNSstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 1:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_expansion.svg' title='"
                + gettext("Use Expansion")
                + "'>"
            )
        elif option == 10:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_tableS.svg' title='"
                + gettext("Smalll Table")
                + "'>"
            )
        elif option == 11:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_table.svg' title='"
                + gettext("Medium Table")
                + "'>"
            )
        elif option == 12:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_tableL.svg' title='"
                + gettext("Large Table")
                + "'>"
            )
        elif option == 20:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_junkS.svg' title='" + gettext("Low Junk") + "'>"
            )
        elif option == 21:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_junk.svg' title='"
                + gettext("Mediumm Junk")
                + "'>"
            )
        elif option == 22:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/CNS/images/so_junkL.svg' title='"
                + gettext("High Junk")
                + "'>"
            )
        elif option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getBUSstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""

    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getHCstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )
        elif option == 3:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_car.jpg' title='"
                    + gettext("Cars Only")
                    + "'>"
            )
        elif option == 4:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_truck.jpg' title='"
                    + gettext("Trucks Only")
                    + "'>"
            )
        elif option == 5:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_sports.jpg' title='"
                    + gettext("Sports Only")
                    + "'>"
            )
        elif option == 6:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_car.jpg' title='"
                    + gettext("Include Cars")
                    + "'>"
            )
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_truck.jpg' title='"
                    + gettext("Include Trucks")
                    + "'>"
            )
        elif option == 7:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_car.jpg' title='"
                    + gettext("Include Cars")
                    + "'>"
            )
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_sports.jpg' title='"
                    + gettext("Include Sports")
                    + "'>"
            )
        elif option == 8:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_truck.jpg' title='"
                    + gettext("Include Trucks")
                    + "'>"
            )
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/HC/images/s_sports.jpg' title='"
                    + gettext("Include Sports")
                    + "'>"
            )
        elif option == 9:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/Lobby/images/startingOptions/HC_moreMainlines.svg' title='"
                    + gettext("Extra Mainlines")
                    + "'>"
            )

    return startingOptionsHTML


def SR_getAQYstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getINDstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 1:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/IND/images/so_hiddenMoney.svg' title='"
                + gettext("Hidden Money")
                + "'>"
            )
        elif option == 2:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/IND/images/so_aegean_map.svg' title='"
                + gettext("Aegean Map")
                + "'>"
            )
        elif option == 3:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/Lobby/images/startingOptions/IND_php_map.svg' title='"
                + gettext("Philippines Map")
                + "'>"
            )
        elif option == 4:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/Lobby/images/startingOptions/IND_merger_subsidy.svg' title='"
                + gettext("Use Merger Subsidy")
                + "'>"
            )
        elif option == 5:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/Lobby/images/startingOptions/IND_shipping_subsidy.svg' title='"
                + gettext("Use Shipping Subsidy")
                + "'>"
            )
        elif option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getKFWstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 7:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_infoLow.svg' title='"
                + gettext("Low Knowledge\nof Hidden Info")
                + "'>"
            )
        if option == 8:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_infoMedMinus.svg' title='"
                + gettext("Medium Knowledge\nof Hidden Info")
                + "'>"
            )
        if option == 9:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_infoHighPlus.svg' title='"
                + gettext("High Knowledge\nof Hidden Info")
                + "'>"
            )
        if option == 6:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_infoHighMinus.svg' title='"
                + gettext("High Knowledge\nof Hidden Info")
                + "'>"
            )
        if option == 5:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_infoMedPlus.svg' title='"
                + gettext("High Knowledge\nof Hidden Info")
                + "'>"
            )

        if option == 1:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_merchants.svg' title='"
                + gettext("Use Merchants Expansion")
                + "'>"
            )
        if option == 2:
            startingOptionsHTML += (
                "<img class='startingOption' src='/static/KFW/images/so_promos.svg' title='"
                + gettext("Use Promo Tiles")
                + "'>"
            )
        if option == 110:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == 120:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getWEBstartingOptionsHTML(startingOptionsArr):
    if not startingOptionsArr:
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    startingOptionsHTML = ""
    for option in startingOptionsArr:
        if option == 110:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
                )
        if option == 120:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_experiencedGame.svg' title='"
                + gettext("Experienced Game")
                + "'>"
            )

    return startingOptionsHTML


def SR_getPointsForPosition(position, maxPlayers):
    """
    Calculate points for a given position (0-based) and number of players.

    Args:
        position (int): 0-based position (0 = 1st, 1 = 2nd, etc.)
        maxPlayers (int): Number of players (3, 4, 5, or 6)

    Returns:
        int: Points for the given position, or 0 if inputs are invalid
    """
    # First check for bye points
    if position == 99:
        if maxPlayers == 3:
            return 6
        elif maxPlayers == 4:
            return 9
        elif maxPlayers == 5:
            return 11
        elif maxPlayers == 6:
            return 13

    # Points schemas for 3, 4, 5, and 6 players
    points_schemas = {3: [10, 7, 3], 4: [15, 11, 7, 3], 5: [20, 14, 10, 6, 2], 6: [25, 18, 13, 9, 5, 2]}

    # Check if player_number is valid
    if maxPlayers not in points_schemas:
        return 0

    # Check if position is valid (0 to player_number-1)
    if not isinstance(position, int) or position < 0 or position >= maxPlayers:
        return 0

    # Return points for the given position
    return points_schemas[maxPlayers][position]
