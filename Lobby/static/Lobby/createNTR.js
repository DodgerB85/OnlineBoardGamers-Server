// createNTR.js - JavaScript for Napoleon's Triumph game creation page

// Player selection logic for 2/4/8 players
function selectPlayers() {
    var num = document.getElementById('playerNumber').value;
    var maxPlayers = parseInt(num);

    for (var i = 2; i <= 8; i++) {
        var row = document.getElementById('selPlayer' + i);
        if (row) {
            row.style.display = (i <= maxPlayers) ? 'block' : 'none';
        }
    }
}

// Initialize on page load
function initGameCreation(fillData, setupData) {
    if (fillData && setupData) {
        document.getElementById('name').value = setupData.gameName;
        document.getElementById('description').value = setupData.gameDescription;
        document.getElementById('pace').value = setupData.gamePace;
        document.getElementById('playerNumber').value = setupData.playerNumber;
        
        // Fill player names
        if (setupData.playerNames && setupData.playerNames.length > 0) {
            for (var i = 0; i < setupData.playerNames.length && i < 7; i++) {
                var input = document.getElementById('player' + (i + 2));
                if (input) input.value = setupData.playerNames[i];
            }
        }
        
        // Fill starting options
        if (setupData.startingOptions) {
            for (var j = 0; j < setupData.startingOptions.length; j++) {
                var opt = setupData.startingOptions[j];
                var checkbox = document.getElementById(getOptionId(opt));
                if (checkbox) checkbox.checked = true;
            }
        }
        
        selectPlayers();
    } else {
        selectPlayers();
    }
}

function getOptionId(optionValue) {
    var mapping = {
        10: 'frenchReinforcements',
        11: 'santonFort',
        12: 'teamPlay',
        110: 'learningGame',
        120: 'experiencedGame',
        102: 'trainingGame',
    };
    return mapping[optionValue] || '';
}

// Team play checkbox handler
function toggleTeamPlay() {
    var teamPlay = document.getElementById('teamPlay');
    var playerNumber = document.getElementById('playerNumber');
    
    if (teamPlay && teamPlay.checked) {
        // Team play selected - set to 4 or 8
        if (playerNumber.value == '2') {
            playerNumber.value = '4';
        }
        playerNumber.disabled = false;
    } else {
        // Not team play - allow 2 players
        playerNumber.disabled = false;
    }
    selectPlayers();
}

// Handle scenario selection
function handleScenarioChange() {
    var scenario = document.querySelector('input[name="scenario"]:checked');
    if (scenario) {
        console.log('Selected scenario:', scenario.value);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    var teamPlayCheckbox = document.getElementById('teamPlay');
    if (teamPlayCheckbox) {
        teamPlayCheckbox.addEventListener('change', toggleTeamPlay);
    }
    
    var scenarioRadios = document.querySelectorAll('input[name="scenario"]');
    scenarioRadios.forEach(function(radio) {
        radio.addEventListener('change', handleScenarioChange);
    });
});