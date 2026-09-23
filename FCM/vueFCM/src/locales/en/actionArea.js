export default {
  actionArea: {
    // Loading / logged out
    savingGame: "Saving Game.... Please Wait....",
    loggedOutPrompt: "Please {register} or {login} to play a game",
    register: "REGISTER",
    login: "LOGIN",
    thanks: "Thanks!",

    // Resign
    resignConfirm: "Are you sure you want to resign?",
    resignUnbalance: "Resigning will unbalance the game for the remaining players",
    resignCarryOn: "Please carry on playing if that is at all possible",
    resignStillCompete: "Even if you think you can't win, you can still aim for longest road / most walls / etc",
    carryOnPlaying: "Carry On Playing",
    confirmResignation: "Confirm Resignation",
    resign: "Resign",

    // Kickout
    playerUsedAllKickoutTime: "Player {name} has used all the standard kickout time.",
    remainingFlexTime: "Remaining Flex-Time:",
    forMoreInfoSeeHelp: "For more information see {help}",
    help: "Help",
    playerTimedOut: "Player {name} has timed out",
    toKickoutPressConfirm: "To kick out {name} press Confirm Kickout",
    allPlayersCanMoveAgain: "All other players will be allowed to move again in this phase",
    allowMoreTimeReload: "Otherwise you can allow {name} more time - reload the page to initiate kickout again",
    notNowAllowMoreTime: "Not now - allow more time",
    keepName: "Keep {name} in the game - but end their current turn",
    confirmKickout: "Confirm Kickout",
    permanentlyRemove: "This will permanently remove {name} from the game",
    cannotBeUndone: "It cannot be undone",
    checkChatAbsence: "Try checking the chat in case they have given a reason for any temporary absence",
    gracePeriodNote: "Please consider giving them a short grace period, in case they are just delayed",
    permanentlyKickout: "Permanently Kickout {name}",
    voteNeededKickout: "A vote from the other players is needed to kick out {name}",
    votesLine: "Votes: {count}/{threshold} ({voters})",
    voteToKickout: "Vote to Kickout {name}",
    youHaveVotedKickout: "You have voted to kick out {name}",
    kickDirectlyIn: "If the other players do not also vote, you will be able to kick them out directly in {countdown}",

    // Game end
    theWinnerIs: "The winner is:",
    congratulations: "CONGRATULATIONS!",
    fancyA: "Fancy a",
    rematch: "rematch",

    // Setup / reserve
    delayRestaurantRound: "Delay Placing your Restaurant for One Round & End Turn",
    reserveEarly: "To save time, you may choose your reserve card early",
    reserveEarlyNote: "You can always choose your reserve card after all restaurants have been placed",

    // Restructuring
    autoFillStructure: "Auto-fill Structure",
    beach: "BEACH",
    returnToBeach: "Return to the beach",
    ceoSlot: "CEO SLOT",

    // Pizza milestone
    pizzaMilestone: "Pizza Milestone",
    chooseSpaceForHouse: "Choose a space on the tile of house #{house}",
    noSpaceForPizzaRadio: "There is no space left for your pizza radio for house #{house}",

    // CEO bonus
    ceoLabelRecruiting: "2x: Hire 1 person or $5 less salary",

    // Coffee milestone
    coffeeMsUnlimitedRange: "The \"First Coffee Sold\" Milestone allows you to place a coffee shop with unlimited range",
    skipCoffeeMilestone: "Skip Coffee Milestone",

    // Payday
    chooseItemsToUse: "Choose the item you want to use:|Choose the {count} items you want to use:",
    payRestInMoney: "Pay the rest in $$$",
    okThankYou: "Ok, thank you very much",
    cautionFireAll: "CAUTION: Do you really want to fire all your employees?",

    // Clean up / fridge
    noFridgeAllThrown: "You have no fridge - all items will be thrown away",
    keepUpTo10: "You may keep up to 10 items. Choose the items you want to throw away",
    keepRemainingOrClick: "You may keep all remaining items, or click on items to throw them away:",
    clickToKeep: "Click to keep",
    noItemsToManage: "No items to manage",

    // Coffee help panel
    coffeeHelpHeading1: "What are the highlighted restaurants / coffee shops?",
    coffeeHelpBody1: "Restaurants / coffee shops that are highlighted indicate where coffee was sold along the route taken by this house.",
    coffeeHelpHeading2: "What are the highlighted road squares?",
    coffeeHelpBody2: "If there is only one valid coffee route from the house to the restaurant, it will be shown. If there are multiple valid routes, the road squares common to all valid coffee routes will be shown.",
    coffeeHelpConfused: "I'm still confused?",
    coffeeHelpReadMore: "Don't worry; coffee can be quite complicated. Please read more help {here}.",

    // Modules
    moduleNames: {
      "8": "Hard Choices",
      "20": "Ketchup Milestone",
      "23": "New Reserve Cards",
      "14": "Movie Stars",
      "15": "Mass Marketeers",
      "13": "Gourmet Food Critics",
      "17": "Rural Marketeers",
      "22": "Lobbyists",
      "16": "Night Shift Manager",
      "19": "Coffee",
      "9": "Fry Chef",
      "10": "Kimchi",
      "11": "Sushi",
      "12": "Noodles",
      "999": "Skip Module",
    },
    moduleDescs: {
      "8": "First to train / First to market good disappear after 2 turns. First to hire 3 disappears after 3 turns",
      "20": "Milestone: The first time someone else sells your demand, gain a permanent -1 to distance",
      "23": "When the bank breaks, add $200 per player. The base price changes to whichever is selected most, from $5, $10, or $20",
      "10": "Houses prioritise a restaurant with their demands + kimchi",
      "12": "Noodles count as any demand item, but only if no one else can supply it",
      "11": "Houses with gardens will try to replace all demand with Sushi",
      "19": "Sell coffee along the route travelled by a house",
      "22": "Add new roads and parks to the map",
      "9": "Adds $10 per total sale",
      "15": "Repeat marketing phase for each Mass Marketeer",
      "17": "Markets to the Rural Area - accessed by freeway ramps",
      "13": "Markets to all houses with a garden",
      "14": "Decide turn order and break ties",
      "16": "Must be put in a management slot. All unsalaried employees work twice during 9-5",
    },
  },
}
