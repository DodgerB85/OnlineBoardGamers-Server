document.addEventListener('DOMContentLoaded', function () {
  // Update all times to local
  var timeSpans = document.getElementsByClassName('timeToConvertSpan');
  for (let i = 0; i < timeSpans.length; i++) {
    var localDateTime = new Date(parseInt(timeSpans[i].innerText)).toLocaleString();
    localDateTime = localDateTime.slice(0, -3);
    //localDateTime = localDateTime.replaceAll(',', '');
    localDateTime = localDateTime.replace(/,/g, "");
    timeSpans[i].innerHTML = localDateTime;
  }
 
  // Add Delete to training games
  var trainingGameDeleteDivs = document.querySelectorAll(".deleteTrainingGame");
  for (let i = 0; i < trainingGameDeleteDivs.length; i++) {

    trainingGameDeleteDivs[i].onclick = function (event) {
      event.cancelBubble = true;
      event.preventDefault()
      event.stopPropagation();

      let gameName;
      if (this.parentNode.parentNode.id.slice(0, 3) === "FCM") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "FCM";

      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "HLC") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "HLC";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "BUS") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "BUS";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "TGZ") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "TGZ";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "CNS") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "CNS";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "AQY") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "AQY";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "IND") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "IND";
      }
      else if (this.parentNode.parentNode.id.slice(0, 3) === "KFW") {
        _gameID = parseInt(this.parentNode.parentNode.id.slice(11));
        gameName = "KFW";
      }

      let csrftoken = getCookie('csrftoken');
      var action = 'deleteTrgGame';

      fetch('/DBO_deleteGame/' + gameName + '/', {

        method: 'DELETE',
        body: JSON.stringify({
          gameID: _gameID,
          action: action,
          return: 'lobby'
        }),
        headers: { "X-CSRFToken": csrftoken },
      })
        .then(response => response.json())
        .then(result => {
          if (result.noGame) alert("Already Deleted")
          else {
            const gameRow = document.getElementById(result.gameType + 'gamesRow' + String(result.gameID))
            fadeOutAndRemove(gameRow);
          }


        })
        .catch(error => {
          console.log('Error:', error);
        });

    };
  }

  // Add click to cusom map
  var customMapImages = document.querySelectorAll(".startingMap");
  for (let i = 0; i < customMapImages.length; i++) {
    customMapImages[i].onclick = function (e) {
      e.stopPropagation(); // stops the browser from redirecting.
      e.preventDefault();
      //let form;
      if (this.getAttribute('data-game') === "FCM") {
        //form = document.getElementById("openInMapEditorForm");
      }
      if (this.getAttribute('data-game') === "TGZ") {
        //document.getElementById("mapDataTGZ").value = this.getAttribute('data-map');
        //form = document.getElementById("openInMapEditorFormTGZ");
      }
      //form.submit();

    };
    customMapImages[i].onmouseenter = function () {
      this.style.opacity = '0.4';
      this.style.cursor = "pointer";
    };

    customMapImages[i].onmouseleave = function () {
      this.style.opacity = '';
    };
  }

  // Add TGZ info
  let customTGZinfos = document.querySelectorAll(".TGZinfoContainer");
  for (let i = 0; i < customTGZinfos.length; i++) {
    customTGZinfos[i].onclick = function (e) {
      e.stopPropagation(); // stops the browser from redirecting.
      e.preventDefault();
      //alert(this.id.slice(3))
      //window.location.href = "/";  // Replace 'another_page' with the actual URL name or path for the destination page
    };

    customTGZinfos[i].addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });

    // MAYBE CAUSING ERROS IF DOESN'T EXIST?
    /*customTGZinfos[i].addEventListener('touchstart', function (event) {
      event.preventDefault();
      const TGZinfoPopup = this.querySelector('.TGZinfoPopup')
      // Calculate the left position of the pop-up
      const popupWidth = 450;
      const screenWidth = window.innerWidth;
      const cursorX = event.clientX;
      const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX;

      // Set the left position of the pop-up
      TGZinfoPopup.style.left = leftPosition + 'px';

      // Show the pop-up
      TGZinfoPopup.style.display = 'block';

    });*/

    /*customTGZinfos[i].onmouseenter = function (event) {
      this.style.opacity = '0.9';
      this.style.cursor = "pointer";

      const TGZinfoPopup = this.querySelector('.TGZinfoPopup')
      // Calculate the left position of the pop-up
      const popupWidth = 450;
      const screenWidth = window.innerWidth;
      const cursorX = event.clientX;
      const leftPosition = cursorX + popupWidth > screenWidth ? screenWidth - popupWidth - 200 : cursorX;

      // Set the left position of the pop-up
      TGZinfoPopup.style.left = leftPosition + 'px';

      // Show the pop-up
      TGZinfoPopup.style.display = 'block';


    };*/

    /*customTGZinfos[i].onmouseleave = function () {
      this.style.opacity = '';
      const TGZinfoPopup = this.querySelector('.TGZinfoPopup')
      TGZinfoPopup.style.display = 'none';
    };*/
  }

}); // END INIT LOBBY

// get CSRF for javascript
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function fadeOutAndRemove(element) {
  const tableCells = element.getElementsByTagName('td');
  const currentHeight = element.offsetHeight + 0;
  const duration = 500; // Adjust the duration for the desired fade-out and height reduction speed

  element.style.transition = `opacity ${duration}ms`;
  element.style.opacity = '0';

  setTimeout(() => {
    element.style.minHeight = `${currentHeight}px`;
    element.style.height = `${currentHeight}px`;

    // Remove all the TDs within the TR
    while (tableCells.length > 0) {
      tableCells[0].remove();
    }

    setTimeout(() => {
      element.style.transition = `height 0.5s ease-out, min-height 0.5s step-end`;
      element.style.height = '0';
      element.style.minHeight = `${currentHeight}px`;

      element.addEventListener('transitionend', () => {
        element.remove();
      });
    }, 0);
  }, duration + 100); // Adjust the delay to ensure sufficient time between TR removals
}

/*function searchGames() {
    const gameSelect = document.getElementById('gameSelect');
    const selectedGame = gameSelect.value;
    
    const practiceCheckbox = document.getElementById('practiceCheckbox');
    const isPractice = practiceCheckbox.checked;
    
    const updatedWithinCheckbox = document.getElementById('updatedWithinCheckbox');
    const isUpdatedWithin3Months = updatedWithinCheckbox.checked;
    
    // Perform search based on selected game and filters
    const searchResults = performSearch(selectedGame, isPractice, isUpdatedWithin3Months);
    
    // Display search results
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    
    if (searchResults.length === 0) {
      resultsDiv.textContent = 'No results found.';
    } else {
      const ul = document.createElement('ul');
      
      searchResults.forEach(result => {
        const li = document.createElement('li');
        li.textContent = result;
        ul.appendChild(li);
      });
      
      resultsDiv.appendChild(ul);
    }
  }
  
  function performSearch(game, isPractice, isUpdatedWithin3Months) {
    // Simulated search function
    // Replace this with your actual search logic
    
    const allGames = [
      { name: 'FCM', practice: true, lastUpdated: '2023-10-01' },
      { name: 'HLC', practice: false, lastUpdated: '2023-11-15' },
      { name: 'BUS', practice: true, lastUpdated: '2023-08-20' },
      { name: 'TGZ', practice: true, lastUpdated: '2023-11-30' },
      { name: 'FCM', practice: false, lastUpdated: '2023-09-05' },
      { name: 'HLC', practice: true, lastUpdated: '2023-10-28' },
      { name: 'BUS', practice: false, lastUpdated: '2023-07-10' },
      { name: 'TGZ', practice: false, lastUpdated: '2023-11-01' }
    ];
    
    const filteredGames = allGames.filter(gameObj => {
      return gameObj.name === game &&
             (isPractice ? gameObj.practice : true) &&
             (!isUpdatedWithin3Months || isUpdatedWithin3Months && isWithin3Months(gameObj.lastUpdated));
    });
    
    return filteredGames.map(gameObj => gameObj.name);
  }
  
  function isWithin3Months(dateString) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const lastUpdatedDate = new Date(dateString);
    
    return lastUpdatedDate >= threeMonthsAgo;
  }*/