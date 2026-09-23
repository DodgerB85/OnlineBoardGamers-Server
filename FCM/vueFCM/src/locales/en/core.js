export default {

/**** ACTION AREA */
actionArea: {
  // Setup phases
  placeInitialHousesGardens: "Place your initial houses and gardens",
  selectModules: "Select modules for the game",
  chooseModuleHeader: "Choose a module to add to the game",
  totalModulesHint: "Total Modules: 6 for 2p, 6 for 3p, 4 for 4p, 5 for 5p, 6 for 6p",
  draftedModules: "Drafted Modules:",
  availableModules: "Available Modules:",
  selectedModule: "Selected Module:",
  addModuleToEndTurn: "Add Module to Game and End Turn",
  skipModuleToEndTurn: "Skip Module and End Turn",
  chooseReserveCard: "Choose your reserve card",
  chooseRotationForNextTile: "Choose a rotation for the next tile",
  chooseNewTileAndRotation: "Choose a new tile and rotation",
  addTileAndEndTurn: "Add Tile and End Turn",

  // Restructuring
  confirmNoMoreEmployees: "You could send more employees to work. Are you sure you want to confirm?",
  chooseEmployeesToWork: "Choose your employees to send to work - select a slot, or choose an employee directly from the beach",
  skipNightShiftManager: "Skip Night Shift Manager",

  // Hiring subphase
  noFiringAfterFirstTurn: "After the first turn, you won't be asked to fire anyone",
  noFiringAfterFirstTurnDetail: "After the first turn, you won't be asked to fire anyone (as long as you don't hire a salaried level 0 employee)",
  canRecruitNewEmployees: "You can recruit new employees",
  nightShiftRecruitTwice: "Your Night Shift Manager allows each recruiting girl to work twice",
  keepRecruitingPointsForTraining: "At least one base employee is no longer available. Keep recruiting points for the training phase if you wish to train an employee directly",
  ceoActionNoRecruitingPoints: "Your CEO has a new action - you have no recruiting points",
  clickToUndoHire: "Click to undo hire",

  // Working day subphase headers
  executeMarketingCampaigns: "Execute marketing campaigns",
  buildHousesAndGardens: "Build houses and gardens",
  openNewRestaurants: "Open new restaurants",
  workingDaySummary: "Working Day Summary",

  // Turn order / other phases
  chooseTurnOrderPosition: "Choose your position in turn order",
  pizzaBombPhase: "Pizza bomb phase",
  chooseCeoBonusReplacement: "Choose a bonus to replace your CEO's action",
  ceoMustChoose: "You must choose a new action for your CEO",

  // Payday
  canFireEmployees: "You can fire any available employees",
  marketersCantFire: "Marketing employees you can't fire:",
  clickToUnfire: "Click to un-fire",
  youreFired: "You're Fired!",

  // Clean up
  manageRefrigeratorResources: "Manage your refrigerator resources"
},

welcome: {
  title: "Welcome to Food Chain Magnate Online!",
  contact: "If you have any suggestions, questions or comments, then please do contact the webmaster at",
  instructions: {
    placeItem: "To place an item on the board, click any of the squares that are highlighted in red",
    rotateItem: "To rotate an item, use the arrows displayed next to the item just above the board",
    viewEmployees: "To see any player's employees and current structure, click on their name in the black bar at the top of the screen",
    viewReserve: "To see the remaining employees, milestones, and other items, click \"Reserve\" in the menu at the top",
    resetTurn: "You will always have the option to reset the current phase / whole working day before you end your turn",
  },
  aiWarning: "Lower expectations! This is AI v 0.1 - It has some vague intelligence.\n Contact me if you're interested in helping develop an AI",
  chooseRestaurant: "Choose your restaurant direction, and then its location on the board",
  newMilestones: "Remember: you are using the <b>New Milestones</b>",
  originalMilestones: "Remember: you are using the <b>Original Milestones</b>",
},

// Phases
phases: {
  setupRestaurants: "Setup - Restaurants",
  setupRestaurantsRound2: "Setup - Restaurants Round 2",
  setupReserveCards: "Setup - Reserve Cards",
  restructuring: "1 - Restructuring",
  orderOfBusiness: "2 - Order of Business",
  workingHours: "3 - Working 9:00-5:00",
  dinnertime: "4 - Dinnertime",
  payday: "5 - Payday",
  marketingCampaigns: "6 - Marketing Campaigns",
  cleanUp: "7 - Clean up",
  gameEnd: "Game End",
  pizzaMilestone: "4 - Pizza Milestone",
  coffeeSellingMilestone: "7 - Coffee Selling Milestone",
  setupDraftModules: "Setup - Draft Modules",
  setupUrbanPlanning: "Setup - Urban Planning",
  chooseCEOBonus: "Choose CEO Bonus"
},

// Milestones
milestones: {
  firstToHire3: "First to Hire 3",
  firstToHire3Title: "First to Hire 3 people in 1 turn",
  firstToHire3Desc: "+ 2 Management Trainees",
  
  firstToThrowAway: "First to throw away",
  firstToThrowAwayTitle: "First to throw away food/drink",
  firstToThrowAwayDesc: "Get a freezer that stores 10 items (food/drink or kimchi)",
  
  firstWaitress: "First waitress",
  firstWaitressTitle: "First waitress played",
  firstWaitressDesc: "Each Waitress +$2 ($5 total)",
  
  firstToHave20: "First to have $20",
  firstToHave20Title: "First to have $20",
  firstToHave20Desc: "May see bank reserve cards",
  
  firstToHave100: "First to have $100",
  firstToHave100Title: "First to have $100",
  firstToHave100Desc: "Your CEO counts as CFO (+50% cash earned). May not have a CFO",
  
  firstToLowerPrices: "First to lower prices",
  firstToLowerPricesTitle: "First to lower price",
  firstToLowerPricesDesc: "Price -$1",
  
  firstToTrain: "First to train",
  firstToTrainTitle: "First to train someone",
  firstToTrainDesc: "$15 discount on salaries",
  
  firstBurgerProduced: "First burger produced",
  firstBurgerProducedTitle: "First burger produced",
  firstBurgerProducedDesc: "+1 Burger Cook",
  
  firstPizzaProduced: "First pizza produced",
  firstPizzaProducedTitle: "First pizza produced",
  firstPizzaProducedDesc: "+1 Pizza Cook",
  
  firstErrandBoy: "First errand boy",
  firstErrandBoyTitle: "First errand boy played",
  firstErrandBoyDesc: "All buyers get + 1 drink from each source",
  
  firstCartOperator: "First cart operator",
  firstCartOperatorTitle: "First cart operator played",
  firstCartOperatorDesc: "Buyers get range +1",
  
  firstToPay20Salaries: "First to pay $20 in salaries",
  firstToPay20SalariesTitle: "First to pay $20 in salaries",
  firstToPay20SalariesDesc: "May use multiple trainers on the same person",
  
  firstBillboard: "First billboard",
  firstBillboardTitle: "First billboard placed",
  firstBillboardDesc: "No salaries for marketeers; Eternal marketing",
  
  firstBurgerMarketed: "First burger marketed",
  firstBurgerMarketedTitle: "First burger marketed",
  firstBurgerMarketedDesc: "+ $5 for every burger sold",
  
  firstPizzaMarketed: "First pizza marketed",
  firstPizzaMarketedTitle: "First pizza marketed",
  firstPizzaMarketedDesc: "+ $5 for every pizza sold",
  
  firstDrinkMarketed: "First drink marketed",
  firstDrinkMarketedTitle: "First drink marketed",
  firstDrinkMarketedDesc: "+ $5 for every drink sold",
  
  firstAirplane: "First airplane",
  firstAirplaneTitle: "First airplane campaign",
  firstAirplaneDesc: "Count +2 open slots when determining order of play",
  
  firstRadio: "First radio",
  firstRadioTitle: "First radio campaign",
  firstRadioDesc: "Your radios market 2 goods per turn instead of 1",
  
  firstMarketeer: "First marketeer",
  firstMarketeerTitle: "First marketeer used",
  firstMarketeerDesc: "Get $5 for every good your marketeers market. Distance -2",
  
  firstMarketingTrainee: "First marketing trainee",
  firstMarketingTraineeTitle: "First marketing trainee used",
  firstMarketingTraineeDesc: "Get a free kitchen trainee and an errand boy",
  
  firstCampaignManager: "First campaign manager",
  firstCampaignManagerTitle: "First campaign manager used",
  firstCampaignManagerDesc: "This turn, may place 1 marketing tile (same duration, type & range)",
  
  firstBrandManager: "First brand manager",
  firstBrandManagerTitle: "First brand manager used",
  firstBrandManagerDesc: "This turn, may place 2 different goods on 1 plane",
  
  firstBrandDirector: "First brand director",
  firstBrandDirectorTitle: "First brand director used",
  firstBrandDirectorDesc: "Your radio is permanent",
  
  firstBurgerSold: "First burger sold",
  firstBurgerSoldTitle: "First burger sold",
  firstBurgerSoldDesc: "Your CEO always has 4 slots (regardless of reserve cards)",
  
  firstPizzaSold: "First pizza sold",
  firstPizzaSoldTitle: "First pizza sold",
  firstPizzaSoldDesc: "Place radio (pizza, 2 turns) on tile of each house that bought pizza",
  
  firstLemonadeSold: "First lemonade sold",
  firstLemonadeSoldTitle: "First lemonade sold",
  firstLemonadeSoldDesc: "Any employee can be trained on the job, preserving color",
  
  firstBeerSold: "First beer sold",
  firstBeerSoldTitle: "First beer sold",
  firstBeerSoldDesc: "May pay salary with food/drink",
  
  firstCokeSold: "First coke sold",
  firstCokeSoldTitle: "First coke sold",
  firstCokeSoldDesc: "Get a freezer that stores 10 items",
  
  firstRecruitingGirl: "First recruiting girl",
  firstRecruitingGirlTitle: "First recruiting girl used",
  firstRecruitingGirlDesc: "Get a free executive vice president; pay no salary for him",
  
  firstTrainer: "First trainer",
  firstTrainerTitle: "First trainer used",
  firstTrainerDesc: "Get a free trainer; no longer need to fire employees if broke",
  
  firstDiscountManager: "First discount manager",
  firstDiscountManagerTitle: "First discount manager used",
  firstDiscountManagerDesc: "Remove $100 from bank each round you discount by $3 or more",
  
  firstHouse: "First house",
  firstHouseTitle: "First house built",
  firstHouseDesc: "May use multiple trainers on the same person",
  
  firstRestaurant: "First restaurant",
  firstRestaurantTitle: "First new restaurant",
  firstRestaurantDesc: "Place a permanent mailbox in restaurant area",
  
  firstWaitressUsed: "First waitress",
  firstWaitressUsedTitle: "First waitress used",
  firstWaitressUsedDesc: "Your salaries are $3 each",
  
  firstCartOperatorUsed: "First cart operator",
  firstCartOperatorUsedTitle: "First cart operator used",
  firstCartOperatorUsedDesc: "Double the amount of drinks hauled by cart/truck/zeppelin",
  
  firstRuralMarketeer: "First rural marketeer",
  firstRuralMarketeerTitle: "First rural marketeer used",
  firstRuralMarketeerDesc: "Place highway offramp",
  
  firstCoffeeSold: "First coffee sold",
  firstCoffeeSoldTitle: "First coffee sold",
  firstCoffeeSoldDesc: "Build one coffee shop in the next clean up phase",
  
  someoneSellsYourDemand: "Someone sells your demand",
  someoneSellsYourDemandTitle: "Someone sells your demand",
  someoneSellsYourDemandDesc: "Distance -1",
  
  firstLobbyist: "First lobbyist",
  firstLobbyistTitle: "First lobbyist used",
  firstLobbyistDesc: "Add tile to city",
  
  firstDumplingSold: "First dumpling sold",
  firstDumplingSoldTitle: "First dumpling sold",
  firstDumplingSoldDesc: "Your CEO gets a bonus"
},

// Employees
employees: {
  waitress: "Waitress",
  waitressDesc: "Get $3 cash. Win ties against restaurants with fewer waitresses",
  
  newBusinessDeveloper: "New Business Developer",
  newBusinessDeveloperDesc: "Place house or garden",
  
  localManager: "Local Manager",
  localManagerDesc: 'Place new restaurant, "COMING SOON". Drive-in available',
  
  regionalManager: "Regional Manager",
  regionalManagerDesc: "Place or move restaurant, opens immediately. Drive-in available",
  
  cfo: "CFO",
  cfoDesc: "Add +50% to cash earned this round",
  
  managementTrainee: "Management Trainee",
  managementTraineeDesc: "2 slots",
  
  juniorVicePresident: "Junior Vice President",
  juniorVicePresidentDesc: "3 slots",
  
  vicePresident: "Vice President",
  vicePresidentDesc: "4 slots",
  
  seniorVicePresident: "Senior Vice President",
  seniorVicePresidentDesc: "5 slots",
  
  executiveVicePresident: "Executive Vice President",
  executiveVicePresidentDesc: "10 slots",
  
  pricingManager: "Pricing Manager",
  pricingManagerDesc: "Price -$1",
  
  luxuriesManager: "Luxuries Manager",
  luxuriesManagerDesc: "Price +$10",
  
  discountManager: "Discount Manager",
  discountManagerDesc: "Price -$3",
  
  marketingTrainee: "Marketing Trainee",
  marketingTraineeDesc: "Place billboard, max duration 2",
  
  campaignManager: "Campaign Manager",
  campaignManagerDesc: "Place mailbox or lower, max duration 3",
  
  brandManager: "Brand Manager",
  brandManagerDesc: "Place airplane or lower, max duration 4",
  
  brandDirector: "Brand Director",
  brandDirectorDesc: "Place radio or lower, max duration 5",
  
  recruitingGirl: "Recruiting Girl",
  recruitingGirlDesc: "Hire 1 person",
  
  recruitingManager: "Recruiting Manager",
  recruitingManagerDesc: "2x Hire 1 person or $5 less salary",
  
  hrDirector: "HR Director",
  hrDirectorDesc: "4x Hire 1 person or $5 less salary",
  
  trainer: "Trainer",
  trainerDesc: "Train 1 person",
  
  coach: "Coach",
  coachDesc: "2 training slots. May train the same person two steps",
  
  guru: "Guru",
  guruDesc: "3 training slots. May train the same person up to three steps",
  
  errandBoy: "Errand Boy",
  errandBoyDesc: "Get 1 drink of any type",
  
  cartOperator: "Cart Operator",
  cartOperatorDesc: "Get 2 drinks from each source on route",
  
  truckDriver: "Truck Driver",
  truckDriverDesc: "Get 3 drinks from each source on route",
  
  zeppelinPilot: "Zeppelin Pilot",
  zeppelinPilotDesc: "Get 2 drinks from each source on route, ignore roads",
  
  kitchenTrainee: "Kitchen Trainee",
  kitchenTraineeDesc: "Produce 1 burger or 1 pizza",
  
  burgerCook: "Burger Cook",
  burgerCookDesc: "Produce 3 burgers",
  
  burgerChef: "Burger Chef",
  burgerChefDesc: "Produce 8 burgers",
  
  pizzaCook: "Pizza Cook",
  pizzaCookDesc: "Produce 3 pizzas",
  
  pizzaChef: "Pizza Chef",
  pizzaChefDesc: "Produce 8 pizzas",
  
  fryChef: "Fry Chef",
  fryChefDesc: "Bonus: +$10 per sale",
  
  kimchiMaster: "Kimchi Master",
  kimchiMasterDesc: "Produce 1 kimchi at end of cleanup phase",
  
  noodleCook: "Noodle Cook",
  noodleCookDesc: "Produce 6 noodles",
  
  noodleChef: "Noodle Chef",
  noodleChefDesc: "Produce 16 noodles",
  
  sushiCook: "Sushi Cook",
  sushiCookDesc: "Produce 2 sushi",
  
  sushiChef: "Sushi Chef",
  sushiChefDesc: "Produce 5 sushi",
  
  baristaTrainee: "Barista Trainee",
  baristaTraineeDesc: "Produce 1 coffee",
  
  barista: "Barista",
  baristaDesc: "Produce 2 coffee",
  
  leadBarista: "Lead Barista",
  leadBaristaDesc: "Produce 5 coffee",
  
  bMovieStar: "B-Movie Star",
  bMovieStarDesc: "Win all ties; first choice in turn order",
  
  cMovieStar: "C-Movie Star",
  cMovieStarDesc: "Win all ties; first choice in turn order (unless B at work)",
  
  dMovieStar: "D-Movie Star",
  dMovieStarDesc: "Win all ties; first choice in turn order (unless B or C at work)",
  
  gourmetFoodCritic: "Gourmet Food Critic",
  gourmetFoodCriticDesc: "Market to all houses with a garden. Max duration 3",
  
  lobbyist: "Lobbyist",
  lobbyistDesc: "Place 1 road or park",
  
  massMarketeer: "Mass Marketeer",
  massMarketeerDesc: "Play an extra marketing phase this turn. Do not remove an extra duration token",
  
  nightShiftManager: "Night Shift Manager",
  nightShiftManagerDesc: "All employees who don't require a salary work twice",
  
  ruralMarketeer: "Rural Marketeer",
  ruralMarketeerDesc: "Place a giant billboard next to the rural area tile",
  
  dumplingCook: "Dumpling Cook",
  dumplingCookDesc: "Produce 3 dumplings",
  
  dumplingChef: "Dumpling Chef",
  dumplingChefDesc: "Produce 8 dumplings",
  
  hawkerMarketeer: "Hawker Marketeer",
  hawkerMarketeerDesc: "Place a hawker marketing campaign",
  
  deliveryDriver: "Delivery Driver",
  deliveryDriverDesc: "Distance from any residence with 2+ demand is 0",
  
  jazzMusician: "Jazz Musician",
  jazzMusicianDesc: "Get $15 cash. Lose ties against restaurants with fewer musicians"
},

// FCM_IO messages
FCM_IO: {
  olderVersionDetected: "Older version detected. Please refresh.",
  olderVersionRefresh: "It appears you have an older version of the game. Please refresh the page",
  gameNotActive: "The game is no longer active; perhaps you have been removed for being inactive",
  somethingWentWrong: "Something went wrong. Please reload the page. If the problem persists, please contact the webmaster",
  tickPermissionFirst: "Please tick a permission option first",
  permissionChanged: "Permission Changed",
}
}
