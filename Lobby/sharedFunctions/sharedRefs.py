#### THESE ITEMS SHOULD BE "PURE" AND INDEPENDENT OF ANY MODELS

import json
import time
import copy
import math
from django.utils.translation import gettext, gettext_lazy
from collections import Counter

import AQY.AQYconstants as rfAQY
import FCM.FCMconstants as rfFCM
import RNB.RNBconstants as rfRNB
import Lobby.sharedFunctions.constants as rf

DISCORD = "DC"
SLACK = "SL"
TELEGRAM = "TG"
OTHER = "OT"

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

    playersData.sort(
        key=lambda r: (-r[2], -r[3][0], -r[4][0], -r[5][0], -r[6][0], r[0])
    )

    # Now remove the -inf's
    cleaned = []
    for row in playersData:
        # Keep only elements that are not ±inf
        # clean_row = [x for x in row if x == x and  x[0] != float('inf') and x[0] != -float('inf')]
        clean_row = [
            item
            for item in row
            if not (
                isinstance(item, list)
                and len(item) > 0
                and math.isinf(item[0])
                and item[0] < 0
            )
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
                roundData.append(
                    ["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"]
                )

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
                groupData[0].append(
                    ["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"]
                )
                groupData[0].append(getCleanedAndSortedRoundData(groupA))
                # groupData.append(["Group B"])
                groupData[1].append(
                    ["Player", "Played", "Won", "TB1", "TB2", "TB3", "TB4"]
                )
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
    tournamentType,
    maxGamePlayers,
    tournamentProgressionData,
    tournamentPointsData,
    gameTypeString,
    tournamentObj,
):
    TPDA = json.loads(tournamentProgressionData)

    roundsHTML = '<div id="tournamentRoundsContainerDiv">'
    pointsList = (
        sorted(json.loads(tournamentPointsData), key=lambda x: -x[1])
        if tournamentPointsData != ""
        else []
    )
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
                lives = (
                    TL_sideData[pointsList[i][0]]
                    if pointsList[i][0] in TL_sideData
                    else 0
                )
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
                    '<tr class="clickableGameRow '
                    + gameTypeString
                    + '" id="gamesRow'
                    + str(row[maxGamePlayers])
                    + '">'
                )
                j = 0
                for j in range(len(row)):
                    # Only add lives if 2L AND it is the latest round
                    if tournamentType == "TL" and i == len(TPDA) - 1:
                        lives = TL_sideData[row[j]] if row[j] in TL_sideData else 0
                        if j == 0:
                            roundsHTML += (
                                '<td><a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + " ("
                                + str(lives)
                                + ")</a>"
                            )
                        elif j < maxGamePlayers:
                            roundsHTML += (
                                ' VS <a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + " ("
                                + str(lives)
                                + ")</a>"
                            )
                    # Else just add the names
                    else:
                        if j == 0:
                            roundsHTML += (
                                '<td><a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + "</a>"
                            )
                        elif j < maxGamePlayers:
                            roundsHTML += (
                                ' VS <a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + "</a>"
                            )

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
                            roundsHTML += (
                                ', <a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + " ("
                                + str(lives)
                                + ")</a>"
                            )
                    else:
                        if j == 1:
                            roundsHTML += (
                                "<td>"
                                + gettext("BYES:")
                                + ' <a href="/profile/'
                                + row[j]
                                + '">'
                                + row[j]
                                + "</a>"
                            )
                        elif j > 1:
                            roundsHTML += (
                                ', <a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                            )

        roundsHTML += "</table>"
        roundsHTML += "</div>"
        roundsHTML += "</div>"
    roundsHTML += "</div>"

    return roundsHTML


def SR_currentTurnString(gameCode, turn, phase):
    if gameCode == "FCM":
        currentTurnString = str(turn) + "."
        if phase == rfFCM.PHASE_SETUP_MODULES:
            currentTurnString = gettext("Setup - Draft Modules")
        if phase == rfFCM.PHASE_URBAN_PLANNING:
            currentTurnString = gettext("Setup - Urban Planning")
        if (
            phase == rfFCM.PHASE_SETUP_RESTAURANT1
            or phase == rfFCM.PHASE_SETUP_RESTAURANT2
        ):
            currentTurnString = gettext("Setup - Restaurants")
        if phase == rfFCM.PHASE_SETUP_RESERVE:
            currentTurnString = gettext("Setup - Reserve Cards")
        if phase == rfFCM.PHASE_RESTRUCTURING:
            currentTurnString += gettext("1 - Restructuring")
        if phase == rfFCM.PHASE_TURN_ORDER:
            currentTurnString += gettext("2 - Order of Business")
        if phase == rfFCM.PHASE_WORKING_DAY:
            currentTurnString += gettext("3 - Working 9:00-5:00")
        if phase == rfFCM.PHASE_DINNERTIME:
            currentTurnString += gettext("4 - Dinnertime")
        if phase == rfFCM.PHASE_PAYDAY:
            currentTurnString += gettext("5 - Payday")
        if phase == rfFCM.PHASE_MARKETING_CAMPAIGNS:
            currentTurnString += gettext("6 - Marketing Campaigns")
        if phase == rfFCM.PHASE_CLEAN_UP:
            currentTurnString += gettext("7 - Clean up")
        if phase == rfFCM.PHASE_GAME_OVER:
            currentTurnString += gettext("Game End")
        if phase == rfFCM.PHASE_PIZZA_BOMB:
            currentTurnString += gettext("4 - Pizza Milestone")
        if phase == rfFCM.PHASE_COFFE_SHOP_MS:
            currentTurnString += gettext("7 - Coffee Shop Milestone")
        if phase == rfFCM.PHASE_CHOOSE_CEO_BONUS:
            currentTurnString += gettext("Choose CEO Bonus")
        return currentTurnString

    elif gameCode == "HC":
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

    elif gameCode == "Bus":
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

    elif gameCode == "TGZ":
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

    elif gameCode == "CNS":
        if phase == 2:
            return gettext("Turn") + " " + str(turn) + " - " + gettext("Production")
        if phase == 4:
            return gettext("Turn") + " " + str(turn) + " - " + gettext("Move Pirates")
        return gettext("Turn") + " " + str(turn)

    elif gameCode == "AQY":
        currentTurnString = str(turn)
        if phase == rfAQY.PHASE_FIRST_CITY:
            currentTurnString += " - " + gettext("Place First City")
        elif phase == rfAQY.PHASE_ALL_RISE:
            currentTurnString += "." + gettext("All Rise")
        elif phase == rfAQY.PHASE_CITY_BUILDING:
            currentTurnString += "." + gettext("City Building")
        elif phase == rfAQY.PHASE_TURN_ORDER:
            currentTurnString += "." + gettext("Turn Order")
        elif phase == rfAQY.PHASE_COUNTRYSIDE_BUILDING:
            currentTurnString += "." + gettext("Countryside Building")
        elif phase == rfAQY.PHASE_STORE_GOODS:
            currentTurnString += "." + gettext("Storage")
        elif phase == rfAQY.PHASE_HARVEST:
            currentTurnString += "." + gettext("Harvest")
        elif phase == rfAQY.PHASE_EXPLORE:
            currentTurnString += "." + gettext("Explore")
        elif phase == rfAQY.PHASE_FAMINE:
            currentTurnString += "." + gettext("Famine")
        elif phase == rfAQY.PHASE_POLLUTION:
            currentTurnString += "." + gettext("Pollution")
        elif phase == rfAQY.PHASE_CHECK_VICTORY:
            currentTurnString += "." + gettext("Game End Check")
        elif phase == rfAQY.PHASE_GAME_OVER:
            currentTurnString += "." + gettext("Game End")
        return currentTurnString

    elif gameCode == "IND":
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

    elif gameCode == "KFW":
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

    elif gameCode == "WEB":
        currentTurnString = gettext("Turn") + " - " + str(turn)
        return currentTurnString

    elif gameCode == "RNB":
        currentTurnString = str(turn) + " - "
        if phase == rfRNB.PHASE_CONFLICT_PRODUCTION_DECISION:
            currentTurnString += gettext("Conflict Decision: Production")
        elif phase == rfRNB.PHASE_CONFLICT_PRODUCTION_PRAYING:
            currentTurnString += gettext("Conflict Praying: Production")
        elif phase == rfRNB.PHASE_CONFLICT_PRODUCTION_TURN_ORDER:
            currentTurnString += gettext("Conflict Turn Order: Production")
        elif phase == rfRNB.PHASE_PRODUCTION_TO:
            currentTurnString += gettext("Production")
        elif phase == rfRNB.PHASE_CONFLICT_MOVEMENT_DECISION:
            currentTurnString += gettext("Conflict Decision: Movement")
        elif phase == rfRNB.PHASE_CONFLICT_MOVEMENT_PRAYING:
            currentTurnString += gettext("Conflict Praying: Movement")
        elif phase == rfRNB.PHASE_CONFLICT_MOVEMENT_TURN_ORDER:
            currentTurnString += gettext("Conflict Turn Order: Movement")
        elif phase == rfRNB.PHASE_MOVEMENT_TO:
            currentTurnString += gettext("Movement")
        elif phase == rfRNB.PHASE_CONFLICT_BUILDING_DECISION:
            currentTurnString += gettext("Conflict Decision: Building")
        elif phase == rfRNB.PHASE_CONFLICT_BUILDING_PRAYING:
            currentTurnString += gettext("Conflict Praying: Building")
        elif phase == rfRNB.PHASE_CONFLICT_BUILDING_TURN_ORDER:
            currentTurnString += gettext("Conflict Turn Order: Building")
        elif phase == rfRNB.PHASE_BUILDING_TO:
            currentTurnString += gettext("Building")
        elif phase == rfRNB.PHASE_CONFLICT_WONDER_DECISION:
            currentTurnString += gettext("Conflict Decision: Wonder")
        elif phase == rfRNB.PHASE_CONFLICT_WONDER_PRAYING:
            currentTurnString += gettext("Conflict Praying: Wonder")
        elif phase == rfRNB.PHASE_CONFLICT_WONDER_TURN_ORDER:
            currentTurnString += gettext("Conflict Turn Order: Wonder")
        elif phase == rfRNB.PHASE_WONDER_TO:
            currentTurnString += gettext("Wonder")
        elif phase == rfRNB.PHASE_GAME_OVER:
            currentTurnString += gettext("Game End")

        return currentTurnString


def SR_gamePaceString(gamePace):
    gamePaceString = ""
    if gamePace == rf.PACE_LIVE:
        gamePaceString = gettext("Live")
    if gamePace == rf.PACE_FAST:
        gamePaceString = gettext("Fast<br/>(Several moves/day)")
    if gamePace == rf.PACE_STANDARD:
        gamePaceString = gettext("Standard<br/>(1-2+ moves/day)")
    if gamePace == rf.PACE_SLOW:
        gamePaceString = gettext("Slow<br/>(1 move/day)")
    if gamePace == rf.PACE_CASUAL:
        gamePaceString = gettext("Casual")
    return gamePaceString


# def SR_getKickoutHTML(kickoutDuration):
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
    preferred_order = [
        rf.SO_LEARNING_GAME,
        rf.SO_EXPERIENCED_GAME,
        rfFCM.SO_SHORT_GAME,
        rfFCM.SO_NO_MILESTONES,
        rfFCM.SO_NO_CEO_MILESTONE,
        rfFCM.SO_NO_RADIO_MILESTONE,
        rfFCM.SO_HARD_CHOICES,
        rfFCM.SO_NEW_MS,
        rfFCM.SO_KETCHUP_MS,
        rfFCM.SO_RESERVE_PRICE,
        rfFCM.SO_MOVIE_STARS,
        rfFCM.SO_MASS_MARKETERS,
        rfFCM.SO_GOURMET,
        rfFCM.SO_RURAL_MARKETERS,
        rfFCM.SO_NEW_DISTRICTS,
        rfFCM.SO_LOBBYISTS,
        rfFCM.SO_NIGHT_SHIFT,
        rfFCM.SO_COFFEE,
        rfFCM.SO_FRY_CHEFS,
        rfFCM.SO_KIMCHI,
        rfFCM.SO_SUSHI,
        rfFCM.SO_NOODLES,
        rfFCM.SO_STRICT_PAYDAY_FRIDGE,
        rfFCM.SO_RANDOM_MODULES,  # Note 200 is here
        rfFCM.SO_DRAFT_MODULE_BREAKER,
        rfFCM.SO_DRAFT_SKIP_MODULE,
        rfFCM.SO_SANDBOX_MODE,
        rfFCM.SO_URBAN_PLANNING,
        rfFCM.SO_URBAN_PLANNING_PLUS,
        rfFCM.SO_JAZZ_MUSICIANS,
        rfFCM.SO_DUMPLINGS,
        rfFCM.SO_DELIVERY_DRIVERS,
        rfFCM.SO_HAWKERS,
    ]

    options_map = {
        rfFCM.SO_SHORT_GAME: ("so_shortGame.svg", "Short Game"),
        rfFCM.SO_NO_MILESTONES: ("so_noMS.svg", "No Milestones"),
        rfFCM.SO_NO_CEO_MILESTONE: ("so_noCEO.svg", "No CFO Milestone"),
        rfFCM.SO_NO_RADIO_MILESTONE: ("so_noRadio.svg", "No Radio Milestone"),
        rfFCM.SO_HARD_CHOICES: ("hardchoices2.jpg", "Hard Choices"),
        rfFCM.SO_NEW_MS: ("so_newMS.svg", "New Milestones"),
        rfFCM.SO_KETCHUP_MS: ("so_ketchupMS.svg", "Ketchup Milestone"),
        rfFCM.SO_RESERVE_PRICE: ("so_reservePrice.jpg", "New Reserve Cards"),
        rfFCM.SO_MOVIE_STARS: ("so_movieStars.svg", "Movie Stars"),
        rfFCM.SO_MASS_MARKETERS: ("so_massMarketeers.jpg", "Mass Marketeers"),
        rfFCM.SO_GOURMET: ("so_GFC.jpg", "Gourmet Food Critics"),
        rfFCM.SO_RURAL_MARKETERS: ("so_rural.jpg", "Rural Marketeers"),
        rfFCM.SO_NEW_DISTRICTS: ("map23.jpg", "New Districts"),
        rfFCM.SO_LOBBYISTS: ("so_lobbyists.jpg", "Lobbyists"),
        rfFCM.SO_NIGHT_SHIFT: ("so_nightShift.jpg", "Night Shift Manager"),
        rfFCM.SO_COFFEE: ("so_coffee.svg", "Coffee"),
        rfFCM.SO_FRY_CHEFS: ("so_fryChef.svg", "Fry Chef"),
        rfFCM.SO_KIMCHI: ("so_kimchi.svg", "Kimchi"),
        rfFCM.SO_SUSHI: ("so_sushi.svg", "Sushi"),
        rfFCM.SO_NOODLES: ("so_noodles.svg", "Noodles"),
        rfFCM.SO_URBAN_PLANNING: ("so_urbanPlanning.svg", "Urban Planning"),
        rfFCM.SO_URBAN_PLANNING_PLUS: (
            "so_urbanPlanningPlus.svg",
            "Urban Planning Plus",
        ),
        rfFCM.SO_JAZZ_MUSICIANS: ("so_jazz.svg", "Jazz Musicians"),
        rfFCM.SO_DUMPLINGS: ("so_dumplings.svg", "Dumplings"),
        rfFCM.SO_DELIVERY_DRIVERS: ("so_delivery.svg", "Delivery Drivers"),
        rfFCM.SO_HAWKERS: ("so_hawker.svg", "Hawkers"),
        rfFCM.SO_STRICT_PAYDAY_FRIDGE: ("so_strict.svg", "Turn Order Payday/Fridge"),
        rfFCM.SO_DRAFT_MODULE_BREAKER: ("so_draftMods.jpg", "Draft Modules"),
        rfFCM.SO_DRAFT_SKIP_MODULE: ("so_skip.jpg", "Skip Module"),
        rfFCM.SO_SANDBOX_MODE: ("so_sandbox.svg", "Sandbox Mode"),
        # These two use the Lobby folder
        rf.SO_LEARNING_GAME: (
            "so_learningGame.svg",
            "Learning Game",
            "/static/Lobby/images/startingOptions/",
        ),
        rf.SO_EXPERIENCED_GAME: (
            "so_experiencedGame.svg",
            "Experienced Game",
            "/static/Lobby/images/startingOptions/",
        ),
    }

    # startingOptionsHTML = "<div>"
    startingOptionsHTML = ""
    sorted_options = [opt for opt in preferred_order if opt in startingOptionsArr]

    for opt in sorted_options:
        # SPECIAL CASE: Random Modules (200)
        if opt == rfFCM.SO_RANDOM_MODULES:
            moduleRange = [
                str(x % 100).zfill(2) for x in startingOptionsArr if 21000 < x < 21116
            ]
            if len(moduleRange) != 2:
                moduleRange = ["??", "??"]

            title = f"{moduleRange[0]} - {moduleRange[1]} {gettext('Random Modules')}"
            startingOptionsHTML += f"<img class='startingOption' src='/static/FCM/images/so_randomMods.svg' title='{title}'>"
            continue

        # STANDARD CASES: Dictionary Lookup
        if opt in options_map:
            mapping = options_map[opt]
            img = mapping[0]
            label = gettext(mapping[1])
            folder = mapping[2] if len(mapping) > 2 else "/static/FCM/images/"

            startingOptionsHTML += (
                f"<img class='startingOption' src='{folder}{img}' title='{label}'>"
            )

    return startingOptionsHTML or "[None]"
    # usedOptions = 0


def SR_getTGZstartingOptionsHTML(startingOptionsArr):
    if startingOptionsArr == "":
        return ""
    if len(startingOptionsArr) == 0:
        return ""
    if startingOptionsArr[0] == rf.SO_TRAINING_GAME:
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
        elif entry == rf.SO_LEARNING_GAME or entry == rf.SO_EXPERIENCED_GAME:
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
    if rf.SO_LEARNING_GAME in startingOptionsArr:
        retHTML += (
            "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
            + gettext("Learning Game")
            + "'>"
        )
    elif rf.SO_EXPERIENCED_GAME in startingOptionsArr:
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
                "<img class='startingOption' src='/static/CNS/images/so_junkS.svg' title='"
                + gettext("Low Junk")
                + "'>"
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
        elif option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        if option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        if option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        if option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        elif option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        if option == rf.SO_LEARNING_GAME:
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        elif option == rf.SO_EXPERIENCED_GAME:
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
        if option == rf.SO_LEARNING_GAME:
            # usedOptions += 1
            startingOptionsHTML += (
                "<img class ='startingOption' src='/static/Lobby/images/startingOptions/so_learningGame.svg' title='"
                + gettext("Learning Game")
                + "'>"
            )
        if option == rf.SO_EXPERIENCED_GAME:
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
        if maxPlayers == 2:
            return 1
        elif maxPlayers == 3:
            return 6
        elif maxPlayers == 4:
            return 9
        elif maxPlayers == 5:
            return 11
        elif maxPlayers == 6:
            return 13

    # Points schemas for 3, 4, 5, and 6 players
    points_schemas = {
        2: [2, 0],
        3: [10, 7, 3],
        4: [15, 11, 7, 3],
        5: [20, 14, 10, 6, 2],
        6: [25, 18, 13, 9, 5, 2],
    }

    # Check if player_number is valid
    if maxPlayers not in points_schemas:
        return 0

    # Check if position is valid (0 to player_number-1)
    if not isinstance(position, int) or position < 0 or position >= maxPlayers:
        return 0

    # Return points for the given position
    return points_schemas[maxPlayers][position]
