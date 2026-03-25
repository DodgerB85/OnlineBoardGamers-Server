from django.urls import reverse

def render_game_icon_html(game_code):
    """Pre-render game icon HTML to avoid template includes"""
    icon_map = {
        "FCM": "burger_board.png",
        "HC": "icon_car.png", 
        "Bus": "bus_icon.png",
        "TGZ": "tgz_icon.png",
        "CNS": "cns_icon.png",
        "AQY": "aqy_icon.png",
        "IND": "ind_icon.png",
        "KFW": "kfw_icon.png",
        "WEB": "web_icon.png",
        "RNB": "rnb_icon.png"
    }
    
    icon_file = icon_map.get(game_code, "default.png")
    return f'<img src="/static/{game_code}/images/{icon_file}" alt="{game_code} game" title="{game_code} Game" class="statsIMG" />'

def render_map_html(game):
    """Pre-render map HTML to avoid template includes"""
    map_html = ""
    
    if hasattr(game, 'startingMap') and game.startingMap:
        if game.gameCode == "FCM":
            map_html = f'''
            <img class="startingOption startingMap"
                 alt="Map"
                 width="50"
                 height="50"
                 src="/static/Lobby/images/createMap.jpg"
                 title="Click to View Map"
                 data-map="{game.startingMap}"
                 data-game="FCM">'''
        elif game.gameCode == "TGZ":
            map_html = f'''
            <img class="startingOption startingMap"
                 alt="Map"
                 width="50"
                 height="50"
                 src="/static/Lobby/images/createMapTGZ.jpg"
                 title="Click to View Map"
                 data-map="{game.startingMap}"
                 data-game="TGZ">'''
        elif game.gameCode == "AQY":
            map_html = f'''
            <img class="startingOption startingMap"
                 alt="Map"
                 width="50"
                 height="50"
                 src="/static/Lobby/images/createMapAQY.jpg"
                 title="Click to View Map"
                 data-map="{game.startingMap}"
                 data-game="AQY">'''
    
    return map_html

def render_current_game_row_html(game):
    """Pre-render complete current game row HTML"""
    chat_icon = ""
    if game.get('chatNotification'):
        chat_icon = '''
        <img class="startingOption"
             alt="Str Opt"
             width="50"
             height="50"
             src="/static/Lobby/images/icon-chat-lobby.svg"
             title="New Chat Message">'''
    
    game_icon = render_game_icon_html(game['gameCode'])
    map_html = render_map_html(game)
    
    creator_link = f'<a href="{reverse("playerInfo", kwargs={"usernameToProfile": game["creator"]})}">{game["creator"]}</a>'
    if game.get('deleteableGame'):
        creator_link = f'''
        <div id="{game["gameCode"]}deleteTrainingGame{game["gameID"]}"
             class="deleteTrainingGame">
            Delete<br/>Practice<br/>Game
        </div>'''
    
    players_html = ""
    for i, player in enumerate(game.get('allPlayers', [])):
        if i > 0:
            players_html += ", "
        players_html += f'<a href="{reverse("playerInfo", kwargs={"usernameToProfile": player})}">{player}</a>'
    
    kickout_html = ""
    if 'SHADOW' not in game.get('allPlayers', []):
        kickout_html = f'<div class="kickoutDiv" data-duration="{game.get("kickoutDuration", "")}"></div>'
    
    return f'''
<tr class="clickableGameRow {'myMove' if game.get('myMove') else ''} {'kickoutRequired1' if game.get('kickoutRequiredNum') == 1 else ''} {'kickoutRequired2' if game.get('kickoutRequiredNum') == 2 else ''}"
    id="{game["gameCode"]}gamesRow{game["gameID"]}"
    onclick="window.location.href='/{game["gameCode"]}/{game["gameID"]}/show/';">
  <td class="nameTDcurrent tdWithBox" id="td1">
    {chat_icon}
    {game_icon}
    <a href="/{game["gameCode"]}/{game["gameID"]}/show/">{game.get("gameName", "")}{f' - <i>{game["gameDescription"]}</i>' if game.get("gameDescription") else ""}</a>
    {map_html}
    {game.get("startingOptionsHTML", "") if game.get("startingOptionsHTML") else ""}
  </td>
  <td>{creator_link}</td>
  <td>{players_html}</td>
  <td>{game.get("currentPlayers", "")}</td>
  <td>{game.get("currentTurn", "")}</td>
  <td>{game.get("pace", "") if game.get("pace") else ""}</td>
  <td>
    <span class="timeToConvertSpan">{game.get("latestUpdate", "")}</span>
    {kickout_html}
    <br />
    {game.get("latestUpdateElapsedTimeString", "")}
  </td>
</tr>'''

def render_finished_game_row_html(game):
    """Pre-render complete finished game row HTML"""
    chat_icon = ""
    if game.get('chatNotification'):
        chat_icon = '''
        <img class="startingOption"
             alt="Str Opt"
             width="50"
             height="50"
             src="/static/Lobby/images/icon-chat-lobby.svg"
             title="New Chat Message">'''
    
    game_icon = render_game_icon_html(game['gameCode'])
    map_html = render_map_html(game)
    
    creator_cell = f'<span class="timeToConvertSpan">{game.get("created", "")}</span>'
    if game.get('deleteableGame'):
        creator_cell = f'''
        <div id="{game["gameCode"]}deleteTrainingGame{game["gameID"]}"
             class="deleteTrainingGame">
            Delete<br/>Practice<br/>Game
        </div>'''
    
    players_html = ""
    for i, player in enumerate(game.get('allPlayers', [])):
        if i > 0:
            players_html += ", "
        players_html += f'<a href="{reverse("playerInfo", kwargs={"usernameToProfile": player})}">{player}</a>'
    
    return f'''
<tr class="clickableGameRow"
    id="{game["gameCode"]}gamesRow{game["gameID"]}"
    onclick="window.location.href='/{game["gameCode"]}/{game["gameID"]}/show/';">
  <td class="nameTDcurrent tdWithBox">
    {chat_icon}
    {game_icon}
    <a href="/{game["gameCode"]}/{game["gameID"]}/show/">{game.get("gameName", "")}{f' - <i>{game["gameDescription"]}</i>' if game.get("gameDescription") else ""}</a>
    {map_html}
    {game.get("startingOptionsHTML", "") if game.get("startingOptionsHTML") else ""}
  </td>
  <td>{game.get("maxPlayers", "")}</td>
  <td>{players_html}</td>
  <td>{creator_cell}</td>
  <td><span class="timeToConvertSpan">{game.get("latestUpdate", "")}</span></td>
  <td>{game.get("winner", "")}</td>
</tr>'''
