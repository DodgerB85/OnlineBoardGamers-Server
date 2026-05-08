// User highscores functionality for RNB

function loadUserScores(username) {
    if (!username) {
        console.error("No username provided");
        return;
    }

    const loadingMessage = document.getElementById("loadingMessage");
    const userScoresTableBody = document.getElementById("userScoresTableBody");
    const noUserScoresMessage = document.getElementById("noUserScoresMessage");

    // Show loading message
    if (loadingMessage) {
        loadingMessage.style.display = "block";
    }

    // Fetch user scores from server
    fetch(`/RNB/getUserHighscores/?username=${encodeURIComponent(username)}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // Hide loading message
                if (loadingMessage) {
                    loadingMessage.style.display = "none";
                }

                // Clear existing scores
                if (userScoresTableBody) {
                    userScoresTableBody.innerHTML = "";
                }

                // Populate user scores table
                if (data.highscores && data.highscores.length > 0) {
                    if (noUserScoresMessage) {
                        noUserScoresMessage.style.display = "none";
                    }

                    data.highscores.forEach((highscore) => {
                        const row = document.createElement("tr");
                        
                        const mapCell = document.createElement("td");
                        mapCell.textContent = highscore.mapName || "Unknown Map";
                        
                        const dateCell = document.createElement("td");
                        let localDateTime = new Date(parseInt(highscore.date_timestamp * 1000)).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'});
                        localDateTime = localDateTime.replace(/,/g, "");
                        dateCell.textContent = localDateTime;
                        
                        const gameCell = document.createElement("td");
                        if (highscore.game && highscore.game !== "N/A") {
                            const gameLink = document.createElement("a");
                            gameLink.href = `/RNB/${highscore.game}/show/`;
                            gameLink.textContent = "Game Link";
                            gameLink.className = "linkOther";
                            gameCell.appendChild(gameLink);
                        } else {
                            gameCell.textContent = highscore.game || "N/A";
                        }
                        
                        const scoreCell = document.createElement("td");
                        scoreCell.className = "scoreCell";
                        scoreCell.textContent = highscore.score;
                        
                        row.appendChild(mapCell);
                        row.appendChild(dateCell);
                        row.appendChild(gameCell);
                        row.appendChild(scoreCell);
                        
                        userScoresTableBody.appendChild(row);
                    });
                } else {
                    // Show no scores message
                    if (noUserScoresMessage) {
                        noUserScoresMessage.style.display = "block";
                    }
                }
            } else {
                console.error("Error loading user highscores:", data.error);
                if (loadingMessage) {
                    loadingMessage.style.display = "none";
                }
                if (noUserScoresMessage) {
                    noUserScoresMessage.style.display = "block";
                    noUserScoresMessage.textContent = data.error || "Error loading highscores.";
                }
            }
        })
        .catch((error) => {
            console.error("Error fetching user highscores:", error);
            if (loadingMessage) {
                loadingMessage.style.display = "none";
            }
            if (noUserScoresMessage) {
                noUserScoresMessage.style.display = "block";
                noUserScoresMessage.textContent = "Network error loading highscores.";
            }
        });
}

function handleUsernameInput(event) {
    // Allow search on Enter key
    if (event.key === "Enter") {
        searchUserScores();
    }
}

function autocomplete(inp) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    var searchtimer;

    document.addEventListener('DOMContentLoaded', function () {
        // Initialize autocomplete for username input
        const usernameInput = document.getElementById("usernameInput");
        autocomplete(usernameInput);
        
        // Load user scores when page loads
        loadUserScores('{{ username }}');
    });

    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        
        currentFocus = -1;
        if (!val) {
            return false;
        }
        
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        
        /*append DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);

        let csrftoken = getCookie("csrftoken");

        fetch("/autoCompleteUsername/", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({
                search: val
            })
        })
        .then(response => response.json())
        .then(data => {
            var arr = data.users || [];
            
            b = document.createElement("DIV");
            b.innerHTML += "<input type='hidden' value='" + arr[0] + "'>"
            for (i = 0; i < arr.length; i++) {
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>"
            }
            /*execute a function when someone clicks on the item value (DIV element):*/
            b.addEventListener("click", function(e) {
                /*insert the value for autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values):*/
                closeAllLists()
            });
            a.appendChild(b);
        })
        .catch(error => {
            console.error("Autocomplete error:", error);
        });
    });

    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            if (currentFocus >= x.length) currentFocus = 0;
            /*add class "autocomplete-active":*/
            x[currentFocus].classList.add("autocomplete-active");
        }
        function removeActive(x) {
            /*a function to remove the "active" class from all autocomplete items:*/
            for (var i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        function closeAllLists(elmnt) {
            /*close all autocomplete lists in the document,
            except for one passed as an argument:*/
            var x = document.getElementsByClassName("autocomplete-items");
            for (var i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
    });
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function searchUserScores() {
    const usernameInput = document.getElementById("usernameInput");
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert("Please enter a username to search.");
        return;
    }
    
    // Navigate to user highscores page
    window.location.href = `/RNB/highscores/${encodeURIComponent(username)}/`;
}
