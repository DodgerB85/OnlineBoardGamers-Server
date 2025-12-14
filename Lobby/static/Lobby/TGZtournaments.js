var global = {};

document.addEventListener('DOMContentLoaded', function () {
  // Update all times to local

  var gameRows = document.querySelectorAll(".gameRow");
  for (let i = 0; i < gameRows.length; i++) {
    if (gameRows[i].id.slice(0, 3) === "TGZ") {
      gameRows[i].onclick = function () {
        window.open("/TGZ/" + this.id.slice(11), "_self");
      };
    }
    gameRows[i].onmouseenter = function () {
      this.style.backgroundColor = 'lightblue';
    };
    gameRows[i].onmouseleave = function () {
      this.style.backgroundColor = 'white';
    };
  }

});
