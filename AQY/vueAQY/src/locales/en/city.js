export default {
	cityArea: {
		// Available men / sandbox
		expectedHarvest: "Expected Harvest:",
		none: "None",
		sandboxAddCity: "Sandbox: Add city",
		sandboxAddGrave: "Sandbox: Add Grave",
		sandboxRemoveGrave: "Sandbox: Remove Grave",
		stopRemovingGraves: "Stop Removing Graves",
		moveBuildings: "(Re)move Buildings",
		stopMoving: "Stop (Re)moving",
		manAll: "Man All",
		cancel: "Cancel",
		unman: "Un-man",
		chooseSaintHint: "Please choose a saint (See above city screen)",
		noAvailableMen: "No Available Men",
		removedHouseAfterMan: "You have removed a house after using the man",
		houseMustBeReadded: "A house must be readded before ending your turn",
		availableMen: "Available Men:",
		graves: "Graves:",

		// Building placement errors
		buildingMust: "Building Must",
		fitInCity: "Fit in City",
		mustBePlaced: "Must be Placed",
		onFreeSpace: "on Free Space",

		// City info line
		famineLevel: "Famine Level: {level}",
		pollution: "- Pollution:",
		gravesCount: "- Graves:",
		countrysideCosts: "Countryside Costs: Woodcutter: W, Mine: W, Fishery: W, Farm: Seed, City: W+S+F+2DL, Inn: F",
	},

	cityActionArea: {
		// City building phase
		buildNewBuildings: "Build New City Buildings",
		moveBuildings: "Re(move) City Buildings",
		choosePatronSaint: "Choose your Patron Saint",
		bonus: "Bonus: {bonus}",
		vr: "VR: {vr}",
		choosePayment: "Choose your payment to add a: {building}",

		// Buttons
		resign: "Resign",
		resetWholeTurn: "Reset whole turn",
		undo: "Undo",
		enter: "Enter",
		exit: "Exit",
		sandboxMode: "Sandbox Mode",
		backToCity: "Back To City",

		// Countryside phase
		mannedCartShops: "Manned Cart Shops: {count}",
		unmannedCartShops: "Un-manned Cart Shops: {count}",
		gravedCartShops: "Graved Cart Shops: {count}",
		buildInCountryside: "Build in the countryside",

		// Famine phase
		gravesLeftToPlace: "Graves Left To Place: {count}",
		preMoveGravesHint: "(You will need to place {number} {max} graves)",
		cancelPreMove: "Cancel Pre Move",
		deletePreMove: "Delete Pre Move",
		saveFamineTurn: "Save Famine Turn",

		// Pollution phase
		placePollution: "Place pollution into your Zone of Control",
		noSpaceForPollution: "No space for pollution in your Zone of Control - Pollution converted to graves",

		// Storage phase
		availableStorage: "Available storage: {count}",
		resourcesToDiscard: "Resources to discard: {count}",
		clickResourcesToDiscard: "Click Resources in your Resource Table to Discard",
		discardedResources: "Discarded resources (click to keep):",
		saveStorageTurn: "Save Storage Turn",

		// End turn
		finishActions: "Finish Actions",
		endTurn: "End Turn",

		// Cancel action buttons
		cancelFreeHouse: "Cancel Free House",
		cancelPlacingBuilding: "Cancel Placing Building",
		cancelTrading: "Cancel Trading",
		finishMoving: "Finish (Re)Moving",
		stopManning: "Stop Manning Buildings",
		stopUnmanning: "Stop Unmanning Buildings",
		stopTrading: "Stop Trading",
		cancelChoosingPayment: "Cancel Choosing Payment",
		stopRemovingGraves: "Stop Removing Graves",

		// Resign
		resignConfirm: "Are you sure you want to resign?",
		cancel: "Cancel",

		// Reasons unable to end phase
		placeRemainingPollution: "Place remaining Pollution",
		placeRemainingGraves: "Place remaining Graves",
		finishPlacingFreeHouse: "Finish placing free house",
		cannotEndMidAction: "You cannot end the phase mid-action",
		finishMovingBuildings: "Finish (Re)moving buildings to end phase",
		finishPlacingAllGraves: "Finish placing all graves",
		mustReAdd: "Before ending the phase, you must re-add: ",
		reAddOneHouse: "You need to re-add 1 house",
		reAddHouses: "You need to re-add {count} houses",

		// End turn warnings
		warningTwoStorages: "Warning: You have built 2 separate Storage Buildings. Did you mean to build 1 big storage?",
		cautionSpareMen: "Caution: You have spare men and unmanned buildings",
		cautionStorage: "Caution: You cannot currently store all your resources (More might be spent in the Countryside Building phase)",
		warningNoWood: "WARNING: You have no wood and no manned Cart Shops",
		cautionUnresolvedTradesNoPeriod: "Caution: You have unresolved trades These will be cancelled",
		cautionUnresolvedTrades: "Caution: You have unresolved trades. These will be cancelled",
		cautionHospitalUnused: "Caution: You have manned a Hospital but not used it. Click the Hospital then the button in the centre",
	},

	cityNewBuildingArea: {
		// Selected building
		selectFreeHouse: "Select a House to add for free",
		selectBuilding: "Select a Building",
		houseNumber: "House {number}",
		buildingFunction: "(Building Function)",
		gainWorker: "Gain 1 worker",

		// Storage selector
		storesMustBe: "Stores must be",
		inBlocks: "in 2x1 blocks",
		blockExamples1: "EG 1x6, 3x4",
		blockExamples2: "2x3, 5x2",
		sizeWidth: "Size: W",
		sizeHeight: "x H",

		// Hospital / cathedral / market
		stopRemovingGraves: "Stop Removing Graves",
		removeAllGraves: "Remove All Graves ({count})",
		removeGraves: "Remove Graves ({count} Left)",
		razeCathedral: "Raze Cathedral",
		cannotRazeCathedral: "You cannot Raze Santa Maria's Cathedral",
		tradeWithBoard: "Trade Goods With Board",
		tradeWithPlayers: "Trade Goods With Other Players",
		tradeBoardHint: "Trade Goods 2:1 in the upper left resource area",
		trading: "Trading:",
		stopTrading: "Stop Trading",
		cancel: "Cancel",

		// Costs
		cost: "Cost",
		buildingCost: "(Building Cost)",
		freePaidPreviously: "Free (Cost paid previously)",
		freePaidSaintPower: "Free (Cost paid when house used with Saint Power)",
		philosophySameLuxury: "Your Faculty of Philosophy allows you to use the same Luxury Good",
		luxuryMustDiffer: "The Luxury Goods must be different",
		free: "Free",
		freeSaintPower: "Free (Saint Power)",
		philosophySameGoods: "Your Faculty of Philosophy allows you to use the same Goods",
		goodsMustDiffer: "The Goods must be different",
		cannotAfford: "You Cannot Afford This Building",

		// Move errors
		moveErrorNotBuiltThisTurn: "Not built this turn",
		moveErrorMannedHospital: "A manned Hospital cannot be moved without the Saint power",
		moveErrorMannedUniversity: "A manned University cannot be moved without the Saint power",
		moveErrorRazedCathedral: "You have used your Faculty of Theology to raze your Cathedral",
		moveErrorMarketTrade: "You have used your Market to Trade",
		moveErrorCathedralAfterSaint: "A cathedral cannot be moved after a saint power has been used",
		moveErrorNoSpaceForGrave: "No free space to move grave",
		moveErrorHospitalWhileMoving: "You cannot build a hospital in the middle of moving buildings",

		// Selected payment
		selectedPayment: "Selected Payment",
		none: "None",
	},

	cityBuildingReserve: {
		uniqueBuildings: "Unique Buildings",
	},

	cityHouseReserve: {
		houses: "Houses",
		free: "Free",
		cost1F: "1-F",
		cost2DF: "2D-F",
		cost3DF: "3D-F",
		cost4DF: "4D-F",
		cost1L: "1-L",
		cost2DL: "2D-L",
		cost3DL: "3D-L",
	},

	cityPlayerInfo: {
		no: "No",
		saint: "Saint",
		bonus: "Bonus: ",
		none: "None",
		vr: "VR: ",
		chooseSaint: "Choose a Saint",
	},
}
