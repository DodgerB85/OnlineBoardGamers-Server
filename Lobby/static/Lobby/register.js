function init() {
    document.getElementById('some_id').addEventListener('input', inputHandler);
}

const inputHandler = function(e) {
    if (e.target.value.toUpperCase().includes("BTINTERNET")) {
        document.getElementById('btWarning').style.display = 'block'
    }
  }

window.addEventListener("load", init); 