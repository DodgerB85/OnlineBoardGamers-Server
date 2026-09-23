export default {
  history: {
    // NOTE: a few messages intentionally include leading/trailing spaces to
    // match layout spacing that used to live in the template - keep them.

    // HistoryTab
    tab: {
      oldestFirst: "Oldest First",
      newestFirst: "Newest First",
      replayMode: "Replay Mode - click an entry to jump to that point in time",
    },

    // Shared bits
    system: "System",
    admin: "admin",
    ruralArea: "Rural Area",
    vertically: "vertically",
    horizontally: "horizontally",
    facing: {
      NE: "NE",
      SE: "SE",
      SW: "SW",
      NW: "NW",
    },
    ordinals: {
      first: "first",
      second: "second",
      third: "third",
      fourth: "fourth",
      fifth: "fifth",
      sixth: "sixth",
    },
    numOrdinals: {
      first: "1st",
      second: "2nd",
      third: "3rd",
      fourth: "4th",
      fifth: "5th",
      sixth: "6th",
    },
    modules: {
      hardChoices: "Hard Choices",
      ketchupMilestone: "Ketchup Milestone",
      newReserveCards: "New Reserve Cards",
      movieStars: "Movie Stars",
      massMarketeers: "Mass Marketeers",
      gourmetFoodCritics: "Gourmet Food Critics",
      ruralMarketeers: "Rural Marketeers",
      lobbyists: "Lobbyists",
      nightShiftManager: "Night Shift Manager",
      coffee: "Coffee",
      fryChef: "Fry Chef",
      kimchi: "Kimchi",
      sushi: "Sushi",
      noodles: "Noodles",
      skipModule: "Skip Module",
    },
    abbr: {
      newBizDev: "New Biz Dev",
      executiveVP: "Executive VP",
      seniorVP: "Senior VP",
      recruitingMgr: "Recruiting Mgr",
      jazzM: "Jazz M",
    },
    salaryPay: "{amount} and {count} item|{amount} and {count} items",

    // Setup / turn order
    chooseStartPos: "{name} chooses their starting restaurant at co-ordinates ({x}, {y}) facing {facing}",
    delaySetup: "{name} chooses to delay their first restaurant",
    chooseReserveCard: "{name} chooses their reserve card",
    chooseTurnOrder: "{name} chooses to play {ordinal}",
    hasToPlayTurnOrder: "{name} has to play {ordinal}",
    chooseTurnOrderAutoEarly: "{name} chooses to play {ordinal} (auto early)",
    chooseTurnOrderAutoLate: "{name} chooses to play {ordinal} (auto late)",

    // Restructuring / hiring / training
    hasNoEmployees: "{name} has no employees",
    sendsToWork: "{name} sends to work:",
    sendsNoOneToWork: "{name} sends no one to work",
    hires: "{name} hires:",
    hiresNoOne: "{name} hires no one",
    trains: "{name} trains:",
    trainsNoOne: "{name} trains no one",
    fromHiring: "[From Hiring]",
    fromStructure: "[From Structure]",

    // Marketing campaigns
    campaignStart: "{name} started marketing campaign #{num} with {employee},",
    atCoords: "at co-ordinates ({x}, {y}), ",
    orientAtCoords: "{orient} at co-ordinates ({x}, {y}), ",
    advertising: "advertising:",
    eternally: "eternally",
    forTurns: "for {count} turn|for {count} turns",
    showRoute: "Show Route",
    nsCampaign: "{name} used their {trainee} again with their {nsm} to start marketing campaign #{num}, ",
    orientAtCoordsAd: "{orient} at co-ordinates ({x}, {y}), advertising:",
    atCoordsAd: "at co-ordinates ({x}, {y}), advertising:",
    mailboxCampaign: "{name} started marketing campaign #{num} (no marketer is used for the Restaurant Milestone), at co-ordinates ({x}, {y}), advertising: {good} eternally",

    // Production
    usesProduce: "{name} uses: {employees} to produce/collect:",
    kimchiProduce: "{name} uses: {emp} during cleanup to produce: 1",

    // Building
    buildHouse: "{name} builds house #{num} {orient} at co-ordinates ({x}, {y})",
    buildGarden: "{name} builds a garden for house #{num} {orient} at co-ordinates ({x}, {y})",
    buildFreeway: "{name} builds a Freeway {orient} at co-ordinates ({x}, {y})",
    openRestaurantLocal: "{name} builds a new restaurant at co-ordinates ({x}, {y}) facing {facing}, opening next turn",
    openRestaurant: "{name} opens a new restaurant at co-ordinates ({x}, {y}) facing {facing}",
    moveRestaurant: "{name} moves a restaurant from co-ordinates ({x1}, {y1}) to co-ordinates ({x2}, {y2}) facing {facing}",

    // Lobbyist park / road (fragments joined in JS)
    park4: "a 4 length park",
    parkT: "a T shaped park",
    parkL: "an L shaped park",
    road2: "2 length road",
    road4: "4 length road",
    roadCorner: "corner road",

    // Dinner time
    noSalesAtAll: "Dinner time: No sales occurred, either due to lack of demand or lack of items",
    dinnerTime: "Dinner time",
    houseLabel: "House #{num}: ",
    apartmentLabel: "Apartment #{num}: ",
    ruralLabel: "Rural Area: ",
    noFulfillDemands: ": No one can fulfill these demands",
    roadworksNote: "Houses required to travel over a roadworks marker this turn add +1 distance per roadworks",
    playersCanFulfill: "Players who can fulfill this demand:",
    providerPriceDistance: "${price}, distance {distance}, ",
    playerOrdinal: "{ordinal} player",
    canFulfill: "Only {player} can fulfill these demands",
    houseGoesTo: "House #{num} goes to {player} for ${amount}",
    apartmentGoesTo: "Apartment #{num} goes to {player} for ${amount}",
    ruralGoesTo: "Rural Area goes to {player} for ${amount}",
    basePriceItems: "Base price ${price} x {count} item.|Base price ${price} x {count} items.",
    doubledGarden: "The base price is doubled, because the house has a garden.",
    doubledParkApartment: "The base price is doubled, because the apartment is adjacent to a park.",
    doubledParkHouse: "The base price is doubled, because the house is adjacent to a park.",
    tripledParkGarden: "The base price is tripled, because the house is adjacent to a park and has a garden.",
    bonusOf: "The player has a bonus of ${amount}.",
    fryChefBonus: "A Fry Chef adds a bonus of ${amount}|Fry Chefs add a bonus of ${amount}",
    distanceReducedMilestone: "Distance reduced due to Milestone",
    coffeeSalesHouse: "Coffee sales for house #{num}: ",
    coffeeSalesApartment: "Coffee sales for apartment #{num}: ",
    coffeeSalesRural: "Coffee sales for Rural Area: ",
    totalIncomeBase: "Total Income: ${amount} (Base price ${price}.",
    noCoffeeSold: "No coffee sold",
    moreInformation: "More Information",

    // Income
    noIncome: "No income",
    incomeHeader: "Income",
    playerHeader: "Player",
    salesHeader: "Sales",
    cfoBonusHeader: "CFO bonus",
    totalHeader: "Total",

    // Salaries
    noSalaries: "No salaries",
    salariesHeader: "Salaries",
    paysSalaries: "{name} pays salaries: ${pay}",

    // Marketing phase summary
    noMarketingCampaigns: "No marketing campaigns",
    marketingCampaignsHeader: "Marketing Campaigns",
    normalAdvertisingRound: "Normal Advertising Round",
    massMarketeerRound: "Mass Marketeer Round {num}",
    campaignHouses: "#{num} put {good} on house {list}|#{num} put {good} on houses {list}",
    campaignApartments: "#{num} put 2x {good} on apartment {list}|#{num} put 2x {good} on apartments {list}",
    giantBillboard: "#Giant Billboard put 2x {good} on the Rural Area",
    campaignFailed: "#{num} was not able to market {good}",

    // Marketing earnings
    marketeersEarnings: "Marketeers earnings",
    earnedForItems: "earned ${amount} for {count} item|earned ${amount} for {count} items",
    building: "building",
    buildings: "buildings",

    // Reserve cards
    reserveCardsAre: "The reserve cards are: ",
    newBasePrice: "The new base price is: ${amount}",

    // Fire / fridge / milestone / CEO / module
    fires: "{name} fires:",
    firesNoEmployees: "{name} fires no employees",
    keeps: "{name} keeps:",
    keepsNothing: "{name} keeps nothing",
    newMilestone: "{name} received a new milestone: ",
    ceoAction: "{name} chose a new CEO action:",
    choosesModule: "{name} chooses:",

    // Game flow
    welcome: "Welcome to Food Chain Magnate",
    startOfTurn: "Start of turn {num}",
    bankAmount: "Bank: ${amount}",
    gameOver: "Game Over",
    winnerIs: "The winner is: {name}",
    milestonesRemoved: "Milestones removed - Hard Choices: ",
    rewindBy: "Game rewound to here by {name}",
    resigns: "{name} Resigns",
    kickedOut: "{name} was kicked out",
    bankBroke: "The bank broke. Refill: ${amount}",
    bankrupted: "Bankrupted!",
    allBankrupt: "All players went bankrupted! Game over",
    oneLeft: "Only one player left! Game over",
    discountMilestone: "$100 has been removed from the bank due to the First Discount Manager Used milestone",
    pizzaBomb: "{name} starts radio campaign #{num} at co-ordinates ({x}, {y}) due to the First Pizza Sold milestone",
    lobbyistPark: "{name} uses a lobbyist to place {details}at co-ordinates ({x}, {y})",
    lobbyistRoad: "{name} uses a lobbyist to place a {details}at co-ordinates ({x}, {y})",
    addsTile: "{name} adds a new Tile at co-ordinates ({x}, {y})",
    buildsCoffeeShop: "{name} builds a coffee shop at co-ordinates ({x}, {y})",
    removesCoffeeShop: "{name} removes a coffee shop from co-ordinates ({x}, {y})",
  },
}
