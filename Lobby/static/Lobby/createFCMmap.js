var availableTiles;
var boardTiles;
var playerCount = 2;

function init() {
    availableTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

    //if (boardTiles.length == 0) {
    if (boardTiles == undefined) {
        boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
    }
    else {
        if (boardTiles.length == 24) playerCount = 3;
        if (boardTiles.length == 32) playerCount = 4;
        if (boardTiles.length == 40) playerCount = 5;
        if (boardTiles.length == 48) playerCount = 6;
        changePlayerNumberGraphics(playerCount);

        for (var i = 0; i < boardTiles.length; i += 2) {
            var index = availableTiles.indexOf(boardTiles[i]);
            availableTiles.splice(index, 1);
        }
    }
    renderAvailableTiles();
    renderBoard(playerCount);

    window.addEventListener('mouseup', function (event) {
        // do logic here
        if (boardTileMoving) {
            //alert("rotate escape")
            boardTileMoving.style.position = 'relative';
            boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] += 1;
            if (boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] == 4) boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] = 0;
            renderAvailableTiles();
            renderBoard(playerCount);
            // reset our element
            boardTileMoving.style.left = '';
            boardTileMoving.style.top = '';
            boardTileMoving.style.height = '';
            boardTileMoving.style.width = '';
            boardTileMoving.style.position = '';
            boardTileMoving.style.zIndex = '';
            boardTileMoving.data = 0;

            boardTileMoving = null;
        }
    });

    window.addEventListener('mousemove', function (event) {
        // do logic here
        if (availableTileMoving) {
            /*availableTileMoving.style.left = event.pageX - availableTileMoving.offsetWidth / 2 + 'px';
            availableTileMoving.style.top = event.pageY - availableTileMoving.offsetHeight / 2 + 'px';
            // Now check underneath for element
            let target = null;
            availableTileMoving.hidden = true;
            if (event.clientX) {
                target = document.elementFromPoint(event.clientX, event.clientY);
            } else {
                target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
            }
            availableTileMoving.hidden = false;
            var elems = document.querySelectorAll(".over");

            [].forEach.call(elems, function (el) {
                el.classList.remove("over");
            });
            if (target.id.slice(0, 9) == "boardTile") {
                target.classList.add('over');
            }*/
            availableTileMove(event);
        }
        else if (boardTileMoving) {
            boardTileMove(event);
            /*boardTileMoving.style.left = event.clientX - boardTileMoving.offsetWidth / 2 + 'px';//;
            boardTileMoving.style.top = event.clientY - boardTileMoving.offsetHeight / 2 + 'px';//;*/

        }
    });

}

function renderAvailableTiles() {
    document.getElementById('availableMapTiles').innerHTML = "";
    for (var i = 0; i < availableTiles.length; i++) {
        var img = document.createElement("img");
        var numString;
        if (availableTiles[i] + 1 <= 9) numString = "0" + String(availableTiles[i] + 1);
        else numString = String(availableTiles[i] + 1);
        img.src = '/static/FCM/Images/map' + numString + '.jpg';
        img.id = 'tile' + availableTiles[i];
        img.class = 'availableTile';
        img.style.cssText = 'width:100px;height:100px;';
        img.style.cursor = 'move';

        img.addEventListener('mousedown', availableTilePickup);
        img.addEventListener('touchstart', availableTilePickup);
        img.addEventListener('mousemove', availableTileMove);
        img.addEventListener('touchmove', availableTileMove, false);
        img.addEventListener('mouseup', availableTileDrop);
        img.addEventListener('touchend', availableTileDrop);

        document.getElementById('availableMapTiles').appendChild(img);

    }

}

let availableTileMoving = null;
let boardTileMoving = null;

function availableTilePickup(event) {
    event.preventDefault();
    availableTileMoving = event.target;
    availableTileMoving.style.opacity = '0.4';
    availableTileMoving.style.position = 'absolute';
    availableTileMoving.style.zIndex = 1000;
    if (event.clientX) {
        // mousemove
        availableTileMoving.style.left = event.pageX - 50 + 'px';
        availableTileMoving.style.top = event.pageY - 50 + 'px';
    } else {
        // touchmove - assuming a single touchpoint
        var touch = event.targetTouches[0];
        // Place element where the finger is
        availableTileMoving.style.left = touch.pageX - 50 + 'px';
        availableTileMoving.style.top = touch.pageY - 50 + 'px';
        event.preventDefault();
    }
}

function availableTileMove(event) {
    if (availableTileMoving) {
        if (event.clientX) {
            // mousemove
            availableTileMoving.style.left = event.pageX - availableTileMoving.offsetWidth / 2 + 'px';
            availableTileMoving.style.top = event.pageY - availableTileMoving.offsetHeight / 2 + 'px';
        } else {
            // touchmove - assuming a single touchpoint
            var touch = event.targetTouches[0];
            // Place element where the finger is
            availableTileMoving.style.left = touch.pageX - 50 + 'px';
            availableTileMoving.style.top = touch.pageY - 50 + 'px';
            event.preventDefault();
        }
        // Now check underneath for element
        let target = null;
        availableTileMoving.hidden = true;
        if (event.clientX) {
            target = document.elementFromPoint(event.clientX, event.clientY);
        } else {
            target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
        }
        availableTileMoving.hidden = false;
        var elems = document.querySelectorAll(".over");

        [].forEach.call(elems, function (el) {
            el.classList.remove("over");
        });
        if (target.id.slice(0, 9) == "boardTile") {
            target.classList.add('over');
        }
    }
}

function boardTilePickup(event) {
    event.preventDefault();
    boardTileMoving = event.target;
    boardTileMoving.classList.remove("r1");
    boardTileMoving.classList.remove("r2");
    boardTileMoving.classList.remove("r3");

    var d = new Date();
    var t = d.getTime();
    boardTileMoving.data = t;
    boardTileMoving.style.opacity = '0.4';
    boardTileMoving.style.position = 'fixed';
    //alert(event.offsetX)

    boardTileMoving.style.zIndex = 1000;
    if (event.clientX) {
        boardTileMoving.style.left = event.offsetX - boardTileMoving.width / 2 + 'px';
        boardTileMoving.style.top = event.offsetY - boardTileMoving.height / 2 + 'px';
    }
    // else touch pickup
    else {

        boardTileMoving.style.position = 'absolute';


        var touch = event.targetTouches[0];
        boardTileMoving.style.left = touch.offsetX - 100 + 'px';
        boardTileMoving.style.top = touch.offsetY - 100 + 'px';



        boardTileMoving.style.left = event.pageX - 100 + 'px';
        boardTileMoving.style.top = event.pageY - 100 + 'px';

        // boardTileMoving.style.position = 'absolute';
        //alert(1)
        // Place element where the finger is
        //boardTileMoving.style.left = touch.pageX  -100 + 'px';
        //boardTileMoving.style.top = touch.pageY  -100 + 'px';

        //boardTileMoving.style.left = event.pageX - boardTileMoving.width / 2 + 'px';
        //boardTileMoving.style.top = event.pageY - boardTileMoving.height / 2 + 'px';

        //boardTileMoving.style.left = event.offsetX - boardTileMoving.width / 2 + 'px';
        //boardTileMoving.style.top = event.offsetY - boardTileMoving.height / 2 + 'px';
    }
}

function boardTileMove(event) {
    if (boardTileMoving) {
        if (event.clientX) {
            //boardTileMoving.style.position = 'absollute';

            //boardTileMoving.style.left = event.pageX - boardTileMoving.offsetWidth / 2 + 'px';
            //boardTileMoving.style.top = event.pageY - boardTileMoving.offsetHeight / 2 + 'px'; 
            //boardTileMoving.style.left = event.offsetX  - boardTileMoving.width/2  + 'px';
            //boardTileMoving.style.top = event.offsetY  - boardTileMoving.height /2  + 'px';

            //boardTileMoving.style.left =  '50px';
            //boardTileMoving.style.top =  '50px';
            boardTileMoving.style.left = event.clientX - boardTileMoving.offsetWidth / 2 + 'px';//;
            boardTileMoving.style.top = event.clientY - boardTileMoving.offsetHeight / 2 + 'px';//;
            //boardTileMoving.style.left = event.offsetX - boardTileMoving.width/2  + 'px';
            //boardTileMoving.style.top = event.offsetY - boardTileMoving.height /2 + 'px';
            // boardTileMoving.style.left = event.pageX - availableTileMoving.offsetWidth / 2 + 'px';
            //  boardTileMoving.style.top = event.pageY - availableTileMoving.offsetHeight / 2 + 'px';
        } else {
            event.preventDefault();
            var touch = event.targetTouches[0];
            // Place element where the finger is
            // boardTileMoving.style.left = touch.pageX - 100 + 'px';
            // boardTileMoving.style.top = touch.pageY - 100 + 'px';
            boardTileMoving.style.position = 'fixed';


            boardTileMoving.style.left = touch.pageX - 100 + 'px';
            boardTileMoving.style.top = touch.pageY - 100 + 'px';


            boardTileMoving.style.left = touch.offsetX - 100 + 'px';
            boardTileMoving.style.top = touch.offsetY - 100 + 'px';

            boardTileMoving.style.left = touch.clientX - boardTileMoving.offsetWidth / 2 + 'px';//;
            boardTileMoving.style.top = touch.clientY - boardTileMoving.offsetHeight / 2 + 'px';//;
        }
        // Now check underneath for element
        /*let target = null;
        boardTileMoving.hidden = true;
        if (event.clientX) {
            target = document.elementFromPoint(event.clientX, event.clientY);
        } else {
            target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
        }
        boardTileMoving.hidden = false;
        var elems = document.querySelectorAll(".over");
        [].forEach.call(elems, function (el) {
            el.classList.remove("over");
        });
        if (target.id.slice(0, 9) == "boardTile") {
            target.classList.add('over');
        }*/
    }
}


function availableTileDrop(event) {
    if (availableTileMoving) {
        document.querySelectorAll(".boardTile").forEach((element) => element.classList.remove('over'));
        //if (event.currentTarget.tagName !== 'HTMLXXXXX') {
        let target = null;
        availableTileMoving.hidden = true;
        if (event.clientX) {
            target = document.elementFromPoint(event.clientX, event.clientY);
        } else {
            target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
        }
        availableTileMoving.hidden = false;
        if (target.id.slice(0, 9) == "boardTile") {

            var sourceTileID = parseInt(availableTileMoving.id.slice(4));
            var destinationTileID = parseInt(target.id.slice(9));

            // remove from available
            var index = availableTiles.indexOf(sourceTileID);
            availableTiles.splice(index, 1);

            // Add back if replacing a tile
            if ((boardTiles[destinationTileID * 2]) != -1) {
                availableTiles.push(boardTiles[destinationTileID * 2]);
                availableTiles.sort(function (a, b) {
                    return a - b;
                });
            }
            // update on board
            boardTiles[destinationTileID * 2] = sourceTileID;

            renderAvailableTiles();
            renderBoard(playerCount);
        }
        else {
            renderAvailableTiles();
        }

        // else reset
        availableTileMoving.style.opacity = '1';
        availableTileMoving.style.cssText = 'width:100px;height:100px;';
        availableTileMoving.style.width = '100px';
        availableTileMoving.style.height = '100px';
        //target.appendChild(moving);
        //}

        // reset our element
        availableTileMoving.style.left = '';
        availableTileMoving.style.top = '';
        availableTileMoving.style.height = '';
        availableTileMoving.style.width = '';
        availableTileMoving.style.position = '';
        availableTileMoving.style.zIndex = '';

        availableTileMoving = null;
    }
}

function boardTileDrop(event) {
    //alert("drop")
    var d = new Date();
    var t = d.getTime();
    if (t - boardTileMoving.data < 300) {
        //alert("rotate")
        boardTileMoving.style.position = 'relative';
        boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] += 1;
        if (boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] == 4) boardTiles[parseInt(boardTileMoving.id.slice(9)) * 2 + 1] = 0;
    }
    else {
        //alert("move")
        var fromPos = 0;
        if (boardTileMoving) {
            document.querySelectorAll(".boardTile").forEach((element) => element.classList.remove('over'));
            //if (event.currentTarget.tagName !== 'HTMLXXXXX') {
            let target = null;
            boardTileMoving.hidden = true;
            if (event.clientX) {
                target = document.elementFromPoint(event.clientX, event.clientY);
            } else {
                target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
            }
            boardTileMoving.hidden = false;
            if (target.id.slice(0, 9) == "boardTile") {

                fromPos = parseInt(boardTileMoving.id.slice(9));
                var toPos = parseInt(target.id.slice(9));

                var tempTile = boardTiles[toPos * 2];
                var tempRot = boardTiles[(toPos * 2) + 1];
                boardTiles[toPos * 2] = boardTiles[fromPos * 2];
                boardTiles[(toPos * 2) + 1] = boardTiles[(fromPos * 2) + 1];
                boardTiles[fromPos * 2] = tempTile;
                boardTiles[fromPos * 2 + 1] = tempRot;

            }
            else {
                if (target.id.slice(0, 7) != "tileDiv") {
                    fromPos = parseInt(boardTileMoving.id.slice(9));
                    availableTiles.push(boardTiles[fromPos * 2]);
                    boardTiles[fromPos * 2] = -1;
                }
            }



            // else reset
            boardTileMoving.style.opacity = '1';
            //boardTileMoving.style.cssText = 'width:100px;height:100px;';
            boardTileMoving.style.width = '200px';
            boardTileMoving.style.height = '200px';
            //target.appendChild(moving);
            //}
        }
    }


    renderAvailableTiles();
    renderBoard(playerCount);
    // reset our element
    boardTileMoving.style.left = '';
    boardTileMoving.style.top = '';
    boardTileMoving.style.height = '';
    boardTileMoving.style.width = '';
    boardTileMoving.style.position = '';
    boardTileMoving.style.zIndex = '';
    boardTileMoving.data = 0;

    boardTileMoving = null;

}

/*function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    //e.dataTransfer.setData('text/html', this.innerHTML);
    e.dataTransfer.setData('sourceID', this.id);
}*/

/*function handleDragEnd(e) {
    this.style.opacity = '1';
    
}*/

/*function handleDragOver(e) {
    e.preventDefault();
    return false;
}*/

function handleDrop(e) {
    e.stopPropagation(); // stops the browser from redirecting.
    e.preventDefault();
    /*document.querySelectorAll(".boardTile").forEach((element) => element.classList.remove('over'));

    if (e.dataTransfer.getData('sourceID') == "") return;
    if (e.dataTransfer.getData('sourceID').slice(0, 5) == "board") {
        var fromPos = parseInt(e.dataTransfer.getData('sourceID').slice(9));
        var toPos = parseInt(this.id.slice(9));

        var tempTile = boardTiles[toPos * 2];
        var tempRot = boardTiles[(toPos * 2) + 1];
        boardTiles[toPos * 2] = boardTiles[fromPos * 2];
        boardTiles[(toPos * 2) + 1] = boardTiles[(fromPos * 2) + 1];
        boardTiles[fromPos * 2] = tempTile;
        boardTiles[fromPos * 2 + 1] = tempRot;
    }
    else {
        var sourceTileID = parseInt(e.dataTransfer.getData('sourceID').slice(4));
        var destinationTileID = parseInt(this.id.slice(9));

        // remove from available
        var index = availableTiles.indexOf(sourceTileID);
        availableTiles.splice(index, 1);

        // Add back if replacing a tile
        if ((boardTiles[destinationTileID * 2]) != -1) {
            availableTiles.push(boardTiles[destinationTileID * 2]);
            availableTiles.sort(function (a, b) {
                return a - b;
            });
        }
        // update on board
        boardTiles[destinationTileID * 2] = sourceTileID;
    }
    renderAvailableTiles();
    renderBoard(playerCount);
*/
    return false;
}

/*function handleDragEnter(e) {
    if (availableTileMoving) this.classList.add('over');
}

function handleDragLeave(e) {
    this.classList.remove('over');
}*/

/*function rotateBoardTile() {
    boardTiles[parseInt(this.id.slice(9)) * 2 + 1] += 1;
    if (boardTiles[parseInt(this.id.slice(9)) * 2 + 1] == 4) boardTiles[parseInt(this.id.slice(9)) * 2 + 1] = 0;
    renderBoard(playerCount);
}*/

function renderBoard(playerCount) {
    //if (setTiles !== undefined) boardTiles = setTiles;
    document.getElementById('board').innerHTML = "";
    var img;
    var W = 3;
    var H = 3;
    var tileWidth = 200;

    if (playerCount == 3) W = 4;
    if (playerCount == 4) {
        W = 4;
        H = 4;
    }
    if (playerCount == 5) {
        W = 5;
        H = 4;
    }
    if (playerCount == 6) {
        W = 6;
        H = 4;
    }

    for (var i = 0; i < (boardTiles.length); i += 2) {
        // Create the divs
        var div = document.createElement("div");
        div.id = 'tileDiv' + String(i / 2);
        div.classList.add('tileDiv');
        div.style.cssText = 'width:' + tileWidth + 'px;height:' + tileWidth + 'px;';
        //div.style.border = '1px black dashed'
        div.style.position = 'absolute';
        //div.style.left = String(((i / 2) % W) * tileWidth) + "px";
        //div.style.top = String((Math.floor((i / 2) / H)) * tileWidth) + 'px';
        div.style.left = String(((i / 2) % W) * tileWidth) + "px";
        div.style.top = String((Math.floor((i / 2) / W)) * tileWidth) + 'px';
        document.getElementById('board').appendChild(div);

        // add the img
        if (boardTiles[i] == -1) {
            img = document.createElement("img");
            img.src = '/static/Lobby/Images/blankTile.jpg';
            img.id = 'boardTile' + String(i / 2);
            img.classList.add('boardTile');
            //img.classList.add('over');
            img.style.cssText = 'width:190px;height:190px;';
            img.style.position = "relative";
            //img.style.border = '1px solid black';

            img.style.top = "5px";
            img.style.left = "5px";

            div.appendChild(img);

        }
        else {
            img = document.createElement("img");
            var numString;
            if (boardTiles[i] + 1 <= 9) numString = "0" + String(boardTiles[i] + 1);
            else numString = String(boardTiles[i] + 1);

            img.src = '/static/FCM/Images/map' + numString + '.jpg';
            img.id = 'boardTile' + String(i / 2);
            img.classList.add('boardTile');
            img.classList.add('r' + boardTiles[i + 1]);
            img.style.width = String(tileWidth) + 'px';
            img.style.height = String(tileWidth) + 'px';
            img.style.cursor = 'pointer';
            img.style.position = "relative";
            img.style.top = "0px";
            img.style.left = "0px";
            //img.addEventListener('dragover', handleDragOver);
            //img.addEventListener('dragenter', handleDragEnter);
            //img.addEventListener('dragleave', handleDragLeave);
            //img.addEventListener('drop', handleDrop);

            img.addEventListener('mousedown', boardTilePickup, false);
            img.addEventListener('touchstart', boardTilePickup);
            img.addEventListener('mousemove', boardTileMove, false);
            img.addEventListener('touchmove', boardTileMove, false);
            img.addEventListener('mouseup', boardTileDrop);
            img.addEventListener('touchend', boardTileDrop);

            //img.addEventListener('click', rotateBoardTile);
            div.appendChild(img);
        }
    }
    // resizze the board area
    document.getElementById('board').style.width = (W * tileWidth + 6) + "px";
    document.getElementById('board').style.height = (H * tileWidth + 6) + "px";
}
function changePlayerNumberGraphics(playerNumber) {
    switch (playerCount) {
        case 2:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            break;
        case 3:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            break;
        case 4:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            break;
        case 5:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            document.getElementById("5player").src = "/static/Lobby/Images/player.png";
            break;
        case 6:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            document.getElementById("5player").src = "/static/Lobby/Images/player.png";
            document.getElementById("6player").src = "/static/Lobby/Images/player.png";
            break;
    }
}

function changePlayerNumber() {
    playerCount = parseInt(this.id.slice(0, 1));
    availableTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    switch (playerCount) {
        case 2:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
            //boardTiles = [20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0, 20, 0];
            break;
        case 3:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
            break;
        case 4:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
            break;
        case 5:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            document.getElementById("5player").src = "/static/Lobby/Images/player.png";
            boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
            break;
        case 6:
            document.querySelectorAll(".playerCount").forEach((element) => element.src = "/static/Lobby/Images/playerNone.png");
            document.getElementById("2player").src = "/static/Lobby/Images/player.png";
            document.getElementById("3player").src = "/static/Lobby/Images/player.png";
            document.getElementById("4player").src = "/static/Lobby/Images/player.png";
            document.getElementById("5player").src = "/static/Lobby/Images/player.png";
            document.getElementById("6player").src = "/static/Lobby/Images/player.png";
            boardTiles = [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0];
            break;
    }
    document.getElementById('BGHstatsContainer').style.display = 'none';
    document.getElementById('BGHBalanceDiv').style.display = 'none';
    endAPIfetch();
    renderAvailableTiles();
    renderBoard(playerCount);

    // DISABLE BGH INTERESTING FOR 69
    if (playerCount === 6) {
        document.getElementById('BGHmapType3').disabled = true;
        document.getElementById('BGHmapType1').checked = false;
        document.getElementById('BGHmapType2').checked = false;
        document.getElementById('BGHmapType3').checked = false;
        document.getElementById('BGHmapType1').checked = true;
    }
    else document.getElementById('BGHmapType3').disabled = false;
}

function fillMap(useAllTiles) {
    availableTiles = shuffle(availableTiles);
    var i = 0;
    for (i = 0; i < boardTiles.length; i += 2) {
        if (boardTiles[i] == -1) {
            if (useAllTiles) {
                boardTiles[i] = availableTiles.pop();
                boardTiles[i + 1] = Math.floor(Math.random() * 4);
            }
            else {
                //while (counter < boardTiles.length && i < availableTiles.length) {
                //while (availableTiles[0] >= 20) {
                //   availableTiles = shuffle(availableTiles);
                //}
                //boardTiles[i] = availableTiles.shift();
                //boardTiles[i + 1] = Math.floor(Math.random() * 4);
                while (availableTiles.length > 0 && availableTiles[0] >= 20) {
                    availableTiles.shift();
                }
                if (availableTiles.length > 0) {
                    boardTiles[i] = availableTiles.shift();
                    boardTiles[i + 1] = Math.floor(Math.random() * 4);
                }
            }
        }
    }

    if (!useAllTiles) {
        // recover available tiles
        for (i = 20; i <= 25; i++) if (!availableTiles.includes(i)) availableTiles.push(i);
    }


    availableTiles.sort(function (a, b) {
        return a - b;
    });
    renderAvailableTiles();
    renderBoard(playerCount);
}

function shuffleCurrentBoard() {
    var tilesToShuffle = [];
    var i;
    for (i = 0; i < boardTiles.length; i += 2) tilesToShuffle.push(boardTiles[i]);
    tilesToShuffle = shuffle(tilesToShuffle);
    for (i = 0; i < boardTiles.length; i += 2) {
        boardTiles[i] = tilesToShuffle.pop();
        boardTiles[i + 1] = Math.floor(Math.random() * 4);

    }
    renderAvailableTiles();
    renderBoard(playerCount);
}

function clearMap() {
    for (var i = 0; i < boardTiles.length; i += 2) {
        boardTiles[i] = -1;
        boardTiles[i + 1] = 0;
    }
    availableTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    renderAvailableTiles();
    renderBoard(playerCount);
}

function createGameWithMap() {

    if (boardTiles.indexOf(-1) > -1) {
        alert("Please create a valid map first");
    }
    else {
        document.getElementById("mapData").value = boardTiles;
        document.getElementById("mapSubmit").submit();


    }
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

function getCookie(name) {
    var cookieValue = null
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';')
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim()
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
}

function startAPIfetch() {
    // Show spinner
    document.getElementById('BGHspinnerDiv').style.display = 'inline-block';
    // Change button text
    document.getElementById('BGHgenerateButton').innerText = "Generating....";
    document.getElementById('BGHgenerateButton').disabled = true;
    // Hide warnings
    document.getElementById('BGHerrorDiv').style.display = 'none';
}

function endAPIfetch() {
    // Show spinner
    document.getElementById('BGHspinnerDiv').style.display = 'none';
    // Change button text
    document.getElementById('BGHgenerateButton').innerText = "Generate Map";
    document.getElementById('BGHgenerateButton').disabled = false;
    document.getElementById('BGHerrorDiv').style.display = 'none';

}

async function generateBGHmap() {
    document.getElementById('BGHstatsContainer').style.display = 'none';
    document.getElementById('BGHBalanceDiv').style.display = 'none';
    document.getElementById('BGHnameSpan').style.display = 'none'

    // playerCount SET ALREADY // 2-6
    let mapOption = document.querySelector('input[name="BGH_map_type"]:checked').value; // 1 random, 2 balanced, 3 interesting
    let newBasicTiles = (document.getElementById("BGH_expTiles").checked ? 'T' : 'F');
    let apartmentTiles = (document.getElementById("BGH_apartmentTiles").checked ? 'T' : 'F');
    let parkTile = (document.getElementById("BGH_parkTile").checked ? 'T' : 'F');

    let url = 'http://api.BoardGameHelpers.com/api/FoodChainMagnate/GenerateMap/'
    let options = `${playerCount},${mapOption},${newBasicTiles},${apartmentTiles},${parkTile},fcmmgapi4829`;
    let csrftoken = getCookie('csrftoken')
    console.log(url + options)
    console.log(options)
    startAPIfetch()
    try {
        const response = await fetch('../BGH_API/' + options, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json; charset=UTF-8',
                'X-CSRFToken': csrftoken
            }
        })
        if (!response.ok) {
            throw new Error('Network response was not ok')
        }
        const data = await response.json()
        //const data1 = await response.json()
        //const data = await JSON.parse(JSON.stringify(data1))
        console.log(data)



        let startingHouses = data["total_number_of_starting_houses"];
        let beerSpots = data["total_number_of_beer_spots"]
        let cokeSpots = data["total_number_of_soda_spots"];
        let lemonadeSpots = data["total_number_of_lemonade_spots"];
        let drinkSpots = data["total_number_of_drink_spots"];
        let nbIndependentPathSystems = data["number_of_independent_path_systems"];
        let nbIndependentNeighbourhoods = data["number_of_independent_neighborhoods"];
        let balanceIssuesArr = []
        document.getElementById('balanceIssuesUL').innerHTML = '';
        if (data["map_option"] === 2) {
            balanceIssuesArr = data["balance_issues"].split('.');
            for (let i = 0; i < balanceIssuesArr.length; i++) {
                let li = document.createElement("li");
                let text = document.createTextNode(balanceIssuesArr[i]);
                li.appendChild(text);
                if (balanceIssuesArr[i] != ' ') document.getElementById('balanceIssuesUL').appendChild(li)

            }
            //document.getElementById('BGHBalanceDiv').innerHTML +='<b>Note: No map is 100% balanced!</b>';
            document.getElementById('BGHBalanceDiv').style.display = 'inline-block'
        }
        document.getElementById('BGH_lemonadeSpots').innerHTML = "x " + String(lemonadeSpots);
        document.getElementById('BGH_coksSpots').innerHTML = "x " + String(cokeSpots);
        document.getElementById('BGH_beerSpots').innerHTML = "x " + String(beerSpots);

        document.getElementById('nbHouses').innerHTML = String(startingHouses);
        document.getElementById('nbPathSystems').innerHTML = String(nbIndependentPathSystems);
        document.getElementById('nbNeighbourhoods').innerHTML = String(nbIndependentNeighbourhoods);

        document.getElementById('BGHnameSpan').innerHTML = '"' + data["map_type_name"] + '"';
        document.getElementById('BGHnameSpan').style.display = 'inline-block'


        boardTiles.splice(0);
        for (let i = 0; i < data["map_tiles"].length; i++) {
            boardTiles = boardTiles.concat(translateTiles(data["map_tiles"][i].tile_letter, data["map_tiles"][i].tile_rotations))
        }

        availableTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
        for (var i = 0; i < boardTiles.length; i += 2) {
            var index = availableTiles.indexOf(boardTiles[i]);
            availableTiles.splice(index, 1);
        }

        renderAvailableTiles();
        renderBoard(playerCount);


        document.getElementById('BGHstatsContainer').style.display = 'inline-block'
        endAPIfetch();
    } catch (error) {
        console.error('Error Generating Map:', error)
        endAPIfetch();
        document.getElementById('BGHerrorDiv').style.display = 'inline';
    }
}


function translateTiles(letter, rotations) {
    if (letter === "A") return [15, rotations]
    if (letter === "B") return [16, rotations]
    if (letter === "C") return [7, rotations]
    if (letter === "D") return [9, rotations]
    if (letter === "E") return [5, rotations]
    if (letter === "F") return [13, rotations]
    if (letter === "G") return [10, rotations]
    if (letter === "H") return [4, rotations]
    if (letter === "I") return [3, rotations]
    if (letter === "J") return [8, rotations]
    if (letter === "K") return [11, rotations]
    if (letter === "L") return [0, rotations]
    if (letter === "M") return [17, rotations]
    if (letter === "N") return [12, rotations]
    if (letter === "O") return [6, rotations]
    if (letter === "P") return [1, rotations]
    if (letter === "Q") return [19, rotations]
    if (letter === "R") return [2, rotations]
    if (letter === "S") return [18, rotations]
    if (letter === "T") return [14, rotations]
    if (letter === "U") return [22, rotations]
    if (letter === "V") return [21, rotations]
    if (letter === "W") return [20, rotations]
    if (letter === "X") return [23, rotations]
    if (letter === "Y") return [24, rotations]
    if (letter === "Z") return [25, rotations]
}