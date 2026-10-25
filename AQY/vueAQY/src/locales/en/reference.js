export default {
	reference: {
		phases: {
			noPhase: "No Phase",
			allRise: "All Rise",
			cityBuilding: "City Building",
			turnOrder: "Turn Order",
			countrysideBuilding: "Countryside Building",
			storeGoods: "Store Goods",
			harvest: "Harvest",
			explore: "Explore",
			famine: "Famine",
			pollution: "Pollution",
			checkVictory: "Check Victory",
			gameOver: "Game Over",
		},
		resources: {
			wood: "Wood",
			stone: "Stone",
			grain: "Grain",
			sheep: "Sheep",
			olives: "Olives",
			fish: "Fish",
			gold: "Gold",
			wine: "Wine",
			pearls: "Pearls",
			dye: "Dye",
		},
		countrysideBuildings: {
			city: "City",
			inn: "Inn",
			woodcutter: "Woodcutter",
			mine: "Mine",
			farm: "Farm",
			fishery: "Fishery",
		},
		terrain: {
			forest: "forest",
			plains: "plains",
			mountains: "mountains",
			water: "water",
			grass: "grass",
		},
		saints: {
			giorgio: {
				name: "San Giorgio",
				bonus: "Get 1 fish per cathedral built this turn",
				victoryRequirement: "Enclose another player with your ZoC",
			},
			barbara: {
				name: "Santa Barbara",
				bonus: "Allows moving buildings (graves can only move to free space)",
				victoryRequirement: "Build all Buildings (Ungraved)",
			},
			christofori: {
				name: "San Christofori",
				bonus: "Store any amount of goods",
				victoryRequirement: "At least 3 of each Food and Luxury Goods",
			},
			nicolo: {
				name: "San Nicolo",
				bonus: "When building a house, build.a second lower numbered house for free",
				victoryRequirement: "Build all houses",
			},
			maria: {
				name: "Santa Maria",
				bonus: "All Saint Bonuses",
				victoryRequirement: "Any 2 Victory Requirements",
			},
		},
		theology: {
			name: "Faculty of Theology",
			description: "May Raze Cathedral",
		},
		biology: {
			name: "Faculty of Biology",
			description: "Build 1 Free Farm per Turn",
		},
		university: {
			name: "University",
			description: "Joins adjacent Faculties (Only need to Man the Uni)",
		},
		alchemy: {
			name: "Faculty of Alchemy",
			description: "Clean 1 Hex and all Neighbours of Pollution",
		},
		philosophy: {
			name: "Faculty of Philosophy",
			description: "Ignore 'D'",
		},
		brewery: {
			name: "Brewery",
			description: "Allows Building Inn",
		},
		forcedLabour: {
			name: "Forced Labour",
			description: "Countryside Harvests 3x, but Discards 1",
		},
		stable: {
			name: "Stable",
			description: "ZoC Grows by 1 Step",
		},
		harbour: {
			name: "Harbour",
			description: "Add Water plus Coast to ZoC",
		},
		explorer: {
			name: "Explorer",
			description: "Allows Sending Out Explorers",
		},
		granary: {
			name: "Granary",
			description: "Prevents 3 Famine",
		},
		dump: {
			name: "Dump",
			description: "Prevents 4 Pollution; Opponents may not Pollute your ZoC",
		},
		cathedral: {
			name: "Cathedral",
			description: "Choose Patron Saint",
		},
		hospital: {
			name: "Hospital",
			description: "Clear 5 Graves",
		},
		market: {
			name: "Market",
			description: "Trade with Players, or 2:1 with Game",
		},
		cart: {
			name: "Cart Shop",
			description: "Allows Building in Countryside",
		},
		fountain: {
			name: "Fountain",
			description: "Drops Famine Level 1 on Build. Reduces Pollution by 1",
		},
		storage: {
			name: "Storage",
			description: "Store 1 Good per Square",
		},
		house: {
			name: "House",
			description: "Get a worker",
		},
		grave: {
			name: "Grave",
			description: "Uses up Space",
		},
	},
}
