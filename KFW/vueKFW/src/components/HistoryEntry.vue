<script setup>
import * as rf from "../js/KFWreference"
import * as view from "../js/KFWview"
import * as history from "../js/KFWhistory"
//import * as replay from "../js/KFWreplay"

import HistoryHex from "./HistoryHex.vue"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

const props = defineProps(["entry", "entry_ID"])

import { computed } from "vue"

function clickedHistoryEntry(action, entry3, entry_id) {
	// If not replay, or if clicking on the replay entry, just do highlights
	if (!store.viewSettings.showReplay || entry_id === -1) history.setupHistoryHighlight(action, entry3, entry_id)
	// Otherwise, you are clicking in history during replay
	//else replay.goToReplayStep(entry_id)
}

function getTimeString(entry2) {
	let timestamp = entry2 * 1000
	var d = new Date(timestamp)
	var res = ""
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()

	return res
}

function getTileNameFromTile_id(tile_id) {
	let tile = rf.ALL_TILES.find((x) => x.id === tile_id)
	return tile.name[0]
}

function getTileNamwFromTileID(tileID) {
	let tile = rf.ALL_TILES.find((x) => x.tileID.includes(tileID))
	if (!tile) {
		alert(`no tile for: ${tileID}`)
		return "NO TILE FOUND"
	}
	let idx = tile.tileID.indexOf(tileID)
	return tile.name[idx]
}

const computedEntry3 = computed(() => {
	let ret = {}
	let entry = props.entry

	ret.incomingRes = []
	ret.newContractGfx = ""
	ret.resTileName = ""
	ret.boat7Atext = ""

	if (entry[0] === rf.HIST_BID_ON_TILE) {
		//let tileID = entry[3][0]
		ret.fromSupply = []
		ret.movedMeeples = []
		//ret.upgraded = 0
		// Check for an array with index[0] of -1
		let fromPlayerItemsIndex = entry[3].findIndex((x) => x[0] === -1)
		if (fromPlayerItemsIndex !== -1) ret.fromSupply = entry[3][fromPlayerItemsIndex].slice(1)
		// Add in all moved meeples
		for (let i = 0; i < entry[3].length; i++) {
			if (entry[3][i].length > 0 && entry[3][i][0] === -2) ret.movedMeeples.push([...entry[3][i].slice(1)])
		}
	}
	// Tile actions
	else if (entry[0] === rf.HIST_ACT_ON_TILE) {
		let tileID = entry[3][0]
		ret.tileID = tileID
		ret.fromSupply = []
		ret.movedMeeples = []
		ret.usedSorcerer = false
		// Check for an array with index[0] of -1
		let fromPlayerItemsIndex = entry[3].findIndex((x) => x[0] === -1)
		if (fromPlayerItemsIndex !== -1) ret.fromSupply = entry[3][fromPlayerItemsIndex].slice(1)
		// Add in all moved meeples
		for (let i = 0; i < entry[3].length - 1; i++) {
			if (entry[3][i].length > 0 && entry[3][i][0] === -2) ret.movedMeeples.push([...entry[3][i].slice(1)])
		}

		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(tileID))
		ret.action = tile.action[0]
		ret.upgraded = rf.getTileIDupgradeNumber(tileID)
		ret.tileName = tile.name[ret.upgraded]

		let cleanEntry3 = entry[3][entry[3].length - 1]

		// If it's sorcerer, handle that here first
		if (ret.action === rf.ACT_TILE_USE_OTHER_TILE) {
			ret.usedSorcerer = true
			let chosenTileID = entry[3][entry[3].length - 2]
			let chosenTile = rf.ALL_TILES.find((t) => t.tileID.includes(chosenTileID))
			let chosenTileUpgradeNumber = rf.getTileIDupgradeNumber(chosenTileID)
			ret.chosenTileName = chosenTile.name[chosenTileUpgradeNumber]
			ret.action = chosenTile.action[chosenTileUpgradeNumber]
			ret.upgraded = chosenTileUpgradeNumber
			ret = updateRetWithActions(ret, chosenTile, entry[1], cleanEntry3)
		} else ret = updateRetWithActions(ret, tile, entry[1], cleanEntry3)
	} // END ACTIONS
	else if (entry[0] === rf.HIST_FILL_BOAT_TILES) {
		ret.boatInfos = []
		for (let i = 0; i < entry[3].length; i++) {
			let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][i][0]))
			let upgraded = tile.tileID.indexOf(entry[3][i][0])
			let name = tile.name[upgraded]
			let meeples = []
			for (let j = 0; j < entry[3][i][1].length; j++) {
				for (let k = 0; k < entry[3][i][1][j]; k++) meeples.push(j)
			}
			let skills = [...entry[3][i][2]]
			let resources = []
			for (let j = 0; j < tile.boatGoods.resArr[upgraded].length; j++) {
				for (let k = 0; k < tile.boatGoods.resArr[upgraded][j]; k++) resources.push(j)
			}
			let cabins = tile.boatGoods.cabins[upgraded]
			let contractNum = tile.boatGoods.contracts[upgraded]
			let greenMeepleNum = tile.boatGoods.greenMeeples[upgraded]
			ret.boatInfos.push({
				name: name,
				meeples: meeples,
				skills: skills,
				resources: resources,
				cabins: cabins,
				contractNum: contractNum,
				greenMeepleNum: greenMeepleNum,
			})
		}
	} else if (entry[0] === rf.HIST_COLLECT_BOAT_RESOURCES) {
		/*** BOAT PHASE */
		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][0]))
		ret.upgraded = tile.tileID.indexOf(entry[3][0])
		ret.incomingMeeples = [...entry[3][1]]
		ret.incomingSkills = [...entry[3][2]]
		/*cabins: 0,
			greenMeeples: 0,
			resources: [],
			contracts: [],
			*/
		ret.incomingCabins = tile.boatGoods.cabins[ret.upgraded]
		ret.incomingGreenMeeples = tile.boatGoods.greenMeeples[ret.upgraded]
		ret.incomingResources = []
		for (let i = 0; i < tile.boatGoods.resArr[ret.upgraded].length; i++) {
			for (let j = 0; j < tile.boatGoods.resArr[ret.upgraded][i]; j++) ret.incomingResources.push(i)
		}
		// Incoming contracts are always hidden
		ret.incomingContractsGfx = []
		if (store.useMerchantsExpansion) {
			// Assume 1 contract
			if (tile.boatGoods.contracts[ret.upgraded] > 0) {
				if (!personal.trainingGame && personal.pov !== entry[1] && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.incomingContractsGfx.push("c_back")
				else ret.incomingContractsGfx.push(rf.ALL_CONTRACTS.find((x) => x.id === entry[3][3][0]).gfx)
			}
		}
		let histFlags = entry[3][entry[3].length - 1]
		ret.hasBoat1a = histFlags.includes(1)
		ret.hasBoat1b = histFlags.includes(2) || histFlags.includes(3)
		ret.collectedGreenMeeple = histFlags.includes(2)
		ret.hasBoat7b = histFlags.includes(4)
		ret.boat7atileID - -1
		ret.boat7atileName - -1
		// Check for boat 7A on any incoming resources
		if (ret.incomingResources.length > 0) {
			let idx = histFlags.indexOf(9)
			if (idx !== -1) {
				ret.boat7atileID = histFlags[idx + 1]
				let boat7atile = rf.ALL_TILES.find((x) => x.tileID.includes(ret.boat7atileID))
				ret.boat7atileName = boat7atile.name[boat7atile.tileID.indexOf(ret.boat7atileID)]
			}
		}
	} else if (entry[0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES) {
		ret.incomingMeeples = []
		for (let i = 0; i < entry[3].length; i++) ret.incomingMeeples.push(entry[3][i])
	} else if (entry[0] === rf.HIST_REPLACE_SEA_BASTION_2) {
		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][0]))
		ret.upgraded = tile.tileID.indexOf(entry[3][0])
		ret.newName = tile.name[ret.upgraded]
	} else if (entry[0] === rf.HIST_COLLECT_BOAT_TILE) {
		/*** BOAT PHASE */
		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][0]))
		ret.upgraded = tile.tileID.indexOf(entry[3][0])
		let histFlags = entry[3][entry[3].length - 1]

		ret.hasBoat1a = histFlags.includes(1)
		ret.hasBoat1b = histFlags.includes(2) || histFlags.includes(3)
		ret.collectedGreenMeeple = histFlags.includes(3)
		ret.hasBoat7b = histFlags.includes(4)
		ret.keyflower2goldIncome = histFlags.includes(5)
		ret.boat7atileID = -1
		ret.boat7atileName = ""
		if (ret.keyflower2goldIncome) {
			// Check for boat 7A on any incoming resources
			let idx = histFlags.indexOf(9)
			if (idx !== -1) {
				ret.boat7atileID = histFlags[idx + 1]
				let boat7atile = rf.ALL_TILES.find((x) => x.tileID.includes(ret.boat7atileID))
				ret.boat7atileName = boat7atile.name[boat7atile.tileID.indexOf(ret.boat7atileID)]
			}
		}
	} else if (entry[0] === rf.HIST_CHOSEN_WINTER_TILES) {
		ret.chosenWinterTiles = []
		ret.chosenCount = []
		if (typeof entry[3][0] === "object") {
			ret.chosenCount = [...entry[3][0]]
			ret.chosenWinterTiles = entry[3].slice(1)
		} else {
			ret.chosenWinterTiles = [...entry[3]]
		}
		ret.chosenWinterTiles.sort((a, b) => a - b)
	}
	// Final actions
	else if (entry[0] === rf.HIST_FREE_UPGRADE) {
		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][0]))
		ret.upgraded = tile.tileID.indexOf(entry[3][0])
	} else if (entry[0] === rf.HIST_FREE_EXTENSION) {
		let tile = rf.ALL_TILES.find((x) => x.tileID.includes(entry[3][0]))
		ret.upgraded = tile.tileID.indexOf(entry[3][0])
		let extension = rf.ALL_EXTENSIONS.find((x) => x.id === entry[3][1])
		ret.extensionGfx = extension.gfx
	}
	return ret
})

function updateRetWithActions(ret, tile, entry1, cleanEntry3) {
	// Spring Auto Actions
	if (ret.action === rf.ACT_TILE_GET_RES) {
		ret.incomingRes = [...tile.action[ret.upgraded + 1]]
		let destinationTileID = cleanEntry3[0]
		let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
		ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
		// Check for boat 7A
		let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
		if (destinationTileID !== ret.tileID && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"
	} else if (ret.action === rf.ACT_TILE_GET_RANDOM_MEEPLE) {
		//ret.incomingMeeples = tile.action[ret.upgraded + 1]
		ret.incomingMeeples = cleanEntry3 //[cleanEntry3.length-1]
	} else if (ret.action === rf.ACT_TILE_GET_MEEPLE_AND_OR_SKILL) {
		// upgraded, get both
		if (ret.upgraded) {
			ret.incomingMeeples = [cleanEntry3[0]]
			ret.incomingSkillTiles = [cleanEntry3[1]]
		} else {
			if (cleanEntry3[0] === 0) ret.incomingMeeples = [cleanEntry3[1]]
			else if (cleanEntry3[0] === 1) ret.incomingSkillTiles = [cleanEntry3[1]]
		}
	} else if (ret.action === rf.ACT_TILE_GET_RANDOM_SKILL_TILE) {
		ret.incomingSkillTiles = cleanEntry3 //tile.action[ret.upgraded + 1]
	} else if (ret.action === rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO) {
		ret.outgoingMeeples = [tile.action[ret.upgraded + 1][0]]
		ret.meepleSource = cleanEntry3[1]
		if (ret.meepleSource >= 0) ret.outgoingMeeples = cleanEntry3[2]

		ret.incomingMeeples = [...tile.action[ret.upgraded + 1]]
		ret.incomingMeeples.shift()
	}
	// Spring other actions
	else if (ret.action === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL) {
		if (ret.upgraded === 0) {
			ret.incomingRes = [cleanEntry3[1]]
			let destinationTileID = cleanEntry3[0]
			let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
			ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
			// Check for boat 7A
			let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
			if (destinationTileID !== ret.tileID && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"
		} else if (ret.upgraded === 1) {
			ret.incomingRes = [rf.WOOD, rf.STONE, rf.IRON]
			let destinationTileID = cleanEntry3[0]
			let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
			ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
			// Check for boat 7A
			let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
			if (destinationTileID !== ret.tileID && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"
		}
	} else if (ret.action === rf.ACT_TILE_CONTRACT_OR_AND_ITEMS) {
		// Either assayer, or merchant
		if (tile.tileID[0] === rf.TILE_M_SPRING_ASSAYER_A) {
			if (ret.upgraded === 0) {
				// Not upgraded, so only 1 thing incoming
				// Res will be length 2 with entry[0] !== -1
				if (cleanEntry3.length === 2 && cleanEntry3[0] !== -1) {
					let destinationTileID = cleanEntry3[0]
					let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
					ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
					ret.incomingRes = [cleanEntry3[1]]
					// Check for boat 7A
					let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
					if (destinationTileID !== rf.TILE_M_SPRING_ASSAYER_A && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"
				}
				// Otherwise, is a contract
				else if (cleanEntry3.length === 1 || (cleanEntry3.length === 2 && cleanEntry3[0] === -1)) {
					// Not prac, not pov, then hidden
					if (cleanEntry3[0] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfx = "c_back"
					// Otherwise not hidden, so find the gfx
					else {
						let contractID = cleanEntry3[0]
						if (cleanEntry3.length === 2) contractID = cleanEntry3[1]
						ret.newContractGfx = rf.ALL_CONTRACTS.find((x) => x.id === contractID).gfx
					}
				}
			} else if (ret.upgraded === 1) {
				// Get everything
				let destinationTileID = cleanEntry3[0]
				let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
				ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
				ret.incomingRes = [rf.STONE, rf.IRON]
				// Check for boat 7A
				let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
				if (destinationTileID !== rf.TILE_M_SPRING_ASSAYER_B && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"

				// contract
				// Not prac, not pov, then hidden
				if (cleanEntry3.length > 1 && cleanEntry3[1] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfx = "c_back"
				else if (cleanEntry3[1] !== -1) ret.newContractGfx = rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[1]).gfx
				else ret.newContractGfx = "c_back"
			}
		} else if (tile.tileID[0] === rf.TILE_M_SUMMER_BOOKKEEPER_A) {
			// Not upgraded = contract OR skill
			if (!ret.upgraded) {
				// Contract
				if (cleanEntry3.length === 2) {
					// Not prac, not pov, then hidden
					if (cleanEntry3[1] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfx = "c_back"
					else ret.newContractGfx = rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[1]).gfx
				}
				// Skill
				else {
					ret.incomingSkillTiles = [cleanEntry3[0]]
				}
			}
			// Upgraded = both
			else if (ret.upgraded === 1) {
				ret.incomingSkillTiles = [cleanEntry3[2]]
				// Contract
				if (cleanEntry3[0] >= 0 || cleanEntry3[1] >= 0) {
					// Not prac, not pov, then hidden
					if (cleanEntry3[1] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfx = "c_back"
					else ret.newContractGfx = rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[1]).gfx
				}
			}
		}
	}
	// Summer Auto Actions
	else if (ret.action === rf.ACT_TILE_SKILL_FOR_RES) {
		ret.usedSkillTile = tile.action[ret.upgraded + 1][0]
		ret.incomingRes = [...tile.action[ret.upgraded + 1].slice(1)]
		let destinationTileID = cleanEntry3[0]
		let destinationTileUpgradeNumber = rf.getTileIDupgradeNumber(destinationTileID)
		ret.resTileName = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID)).name[destinationTileUpgradeNumber]
		// Check for boat 7A
		let detinationTile = rf.ALL_TILES.find((x) => x.tileID.includes(destinationTileID))
		if (destinationTileID !== ret.tileID && detinationTile.season !== rf.SEASON_HOME_TILE) ret.boat7Atext = "(using boat 7A)"
	}
	// Summer Manual Actions
	else if (ret.action === rf.ACT_TILE_SKILL_FOR_GREEN) {
		ret.outgoingSkillTiles = [...cleanEntry3]
		ret.incomingMeeples = []
		let numGreen = tile.action[tile.upgraded + 1][1]
		for (let i = 0; i < numGreen; i++) ret.incomingMeeples.push(rf.MEEPLE_GREEN)
	} else if (ret.action === rf.ACT_TILE_EXCHANGE_MEEPLE_MANUAL) {
		ret.outgoingMeeples = [cleanEntry3[0]]
		ret.incomingMeeples = [...cleanEntry3.slice(1)]
	} else if (ret.action === rf.ACT_TILE_EXCHANGE_SKILL_FOR_SKILL) {
		ret.outgoingSkillTiles = [cleanEntry3[0]]
		ret.incomingSkillTiles = [...cleanEntry3.slice(1)]
	} else if (ret.action === rf.ACT_TILE_SKILL_FOR_MEEPLE) {
		ret.outgoingSkillTiles = [cleanEntry3[0]]
		ret.incomingMeeples = [...cleanEntry3.slice(1)]
	}

	/*else if (ret.action === rf.ACT_TILE_USE_OTHER_TILE) {
		let chosenTileID = entry[3][2]
		let chosenTile = rf.ALL_TILES.find((t) => t.tileID.includes(chosenTileID))
		let chosenTileUpgradeNumber = rf.getTileIDupgradeNumber(chosenTileID)
		ret.chosenTileName = chosenTile.name[chosenTileUpgradeNumber]
	}*/
	// Autumn Manual Actions
	else if (ret.action === rf.ACT_TILE_GET_CONTRACT) {
		ret.newContractGfxs = []
		if (tile.tileID[ret.upgraded] === rf.TILE_M_AUTUMN_MERCHANT_A) {
			// If there's only 1 entry it is visible
			if (cleanEntry3.length === 1) ret.newContractGfxs.push(rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[0]).gfx)
			else if (cleanEntry3.length > 1 && cleanEntry3[0] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfxs = ["c_back"]
			//else if (cleanEntry3[0] !== -1) ret.newContractGfxs = [rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[0]).gfx]
			else if (cleanEntry3[1] !== -1) ret.newContractGfxs.push(rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[1]).gfx)
			else ret.newContractGfxs = ["c_back"]
		} else if (tile.tileID[ret.upgraded] === rf.TILE_M_AUTUMN_MERCHANT_B) {
			for (let i = 0; i < cleanEntry3.length; i++) {
				// If there's only 1 entry it is visible
				if (cleanEntry3[i].length === 1) ret.newContractGfxs.push(rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[i][0]).gfx)
				else if (cleanEntry3[i][1] === -1 && !personal.trainingGame && personal.pov !== entry1 && store.gameflow.phase !== rf.PHASE_GAME_OVER) ret.newContractGfxs.push("c_back")
				else if (cleanEntry3[i][1] !== -1) ret.newContractGfxs.push(rf.ALL_CONTRACTS.find((x) => x.id === cleanEntry3[i][1]).gfx)
				else ret.newContractGfxs.push("c_back")
			}
		}
	}
	// General actions
	else if (ret.action === rf.ACT_TILE_MOVE_AND_UPGRADE) {
		ret.upgradedTileArr = []
		ret.movedResArr = []
		ret.extensionsArr = []
		// find arrays that doen't begin with -1, -2, or the last entry
		for (let i = 0; i < cleanEntry3.length; i++) {
			// -3 is upgrades
			if (cleanEntry3[i][0] === -3) {
				let upgradeData = {}
				upgradeData.tileID = cleanEntry3[i][1]
				upgradeData.meeplesUsed = []
				upgradeData.skillsUsed = []
				upgradeData.resUsed = []

				if (upgradeData.tileID === rf.TILE_AUTUMN_TALTON_LODGE_A) upgradeData.meeplesUsed = cleanEntry3[i][2]
				else if (upgradeData.tileID === rf.TILE_AUTUMN_INN_A) {
					upgradeData.resUsed = cleanEntry3[i][2]
					upgradeData.skillsUsed = cleanEntry3[i][3]
				} else {
					// Otherwise, just a single upgrade from EITHER res OR skills
					let tile = rf.ALL_TILES.find((t) => t.tileID.includes(upgradeData.tileID))
					if (tile.upgradeCost.resCost.length > 0) upgradeData.resUsed = cleanEntry3[i][2]
					else if (tile.upgradeCost.skillCost.length > 0) upgradeData.skillsUsed = cleanEntry3[i][2]
				}
				ret.upgradedTileArr.push(upgradeData)
			}
			// -4 is extensions
			else if (cleanEntry3[i][0] === -4) {
				let extensionData = {}
				extensionData.tile_id = cleanEntry3[i][1]
				extensionData.extension_id = cleanEntry3[i][2]
				let extension = rf.ALL_EXTENSIONS.find((e) => e.id === extensionData.extension_id)
				extensionData.extension_gfx = extension.gfx
				let chosenRes = -1
				if (cleanEntry3[i].length > 3) chosenRes = cleanEntry3[i][3]

				// entry will only be length 3 if something was manually selected
				extensionData.meeplesUsed = extension.requiredMeeples
				extensionData.skillsUsed = extension.requiredSkillTiles
				extensionData.resUsed = extension.requiredResources
				for (let j = 0; j < extension.requiredMeeples.length; j++) {
					if (extension.requiredMeeples[j] === rf.MEEPLE_ANY) extensionData.meeplesUsed[j] = chosenRes
				}
				for (let j = 0; j < extension.requiredResources.length; j++) {
					if (extension.requiredResources[j] === rf.RES_ANY) extensionData.resUsed[j] = chosenRes
				}

				ret.extensionsArr.push(extensionData)
			} else {
				let moveData = {}
				moveData.fromTileID = cleanEntry3[i][0]
				moveData.toTileID = cleanEntry3[i][1]
				moveData.res = cleanEntry3[i][2]
				moveData.distance = cleanEntry3[i][3]
				ret.movedResArr.push(moveData)
			}
		}
	}
	return ret
}

function getOrdinal(num) {
	if (num === 1) return "1st"
	else if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	else if (num === 5) return "5th"
	else if (num === 6) return "6th"
	return "Unknown"
}

function getTileNameForVillageExpansion(tileID) {
	try {
		let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
		let upgraded = tile.tileID.indexOf(tileID)
		return tile.name[upgraded]
	} catch {
		return "(Data structure changed. Will work for future games)"
	}
}
</script>

<template>
	<span v-if="personal.name === 'admin'">
		Computed: {{ entry[3] }}
		<br />
		<!-- NB remove 1 index as NEW_GAME is only in computed -->
		Raw: {{ entry_ID >= 1 && entry_ID < store.history.length + 1 ? store.history[entry_ID - 1][3] : "NA" }}
	</span>
	<!-- New Game -->
	<template v-if="entry[0] === rf.HIST_NEW_GAME">
		<div class="log separator mainEntry" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="new_turn">
				Welcome to Keyflower!
				<br />
				<div
					v-for="(player, idx) in store.players"
					:key="idx"
					class="playerScoreSummaryDiv"
					:style="{
						backgroundColor: personal.getCorrectedColourHex(store.players[idx].colour),
						color: personal.getCorrectedColourText(store.players[idx].colour),
					}">
					<span
						:style="{
							backgroundColor: personal.getCorrectedColourHex(store.players[idx].colour),
							color: personal.getCorrectedColourText(store.players[idx].colour),
						}">
						{{ store.players[idx].displayName }}
					</span>
				</div>
			</div>
		</div>
	</template>

	<!-- GAME END -->
	<template v-if="entry[0] === rf.HIST_GAME_END">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry new_turn">
				<b><u>Final Scores</u></b>
				<br />
				<br />
				<!--<template v-if="store.context.finalPositions.length === 1">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.context.finalPositions[0]].colour)">{{ store.players[store.context.finalPositions[0]].displayName }}</span>
					wins as King of the Hill
				</template>
				<template v-else>-->
				<template v-for="(finalEntry, idx) in store.context.finalPositions" :key="idx">
					{{ getOrdinal(idx + 1) }}:
					<template v-for="(playerIndex, idx2) in finalEntry" :key="idx2">
						<span class="mainEntryPlayer" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour), color: personal.getCorrectedColourText(store.players[playerIndex].colour) }">{{ store.players[playerIndex].displayName }}</span>
						Total: {{ store.players[playerIndex].finalScore }}
						<br />
					</template>
				</template>
				<br />
			</div>
		</div>
	</template>

	<!-- HIST_SEASON_TILES-->
	<template v-if="entry[0] === rf.HIST_SEASON_TILES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b>
					<u>{{ view.getSeasonText(entry[3][0]) }} Tiles Used</u>
				</b>
				<br />
				<span v-for="(tile_id, idx) in entry[3].slice(1)" :key="idx">
					{{ rf.ALL_TILES.find((t) => t.id === tile_id).name[0] }}
					<br />
				</span>
			</div>
		</div>
	</template>

	<!-- HIST_FILL_BOAT_TILES -->
	<template v-if="entry[0] === rf.HIST_FILL_BOAT_TILES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b>
					<u>New Boat Resources</u>
				</b>
				<br />
				<template v-for="(entry, idx1) in computedEntry3.boatInfos" :key="idx1">
					<b>{{ entry.name }}</b>
					:
					<!-- Green Meeples-->
					<template v-for="greenMeepleNum in entry.greenMeepleNum" :key="greenMeepleNum">
						<img class="meepleImg" :src="view.getImage('meeple_3')" alt="Meeple" />
					</template>
					<!-- Meeples -->
					<template v-for="(meeple, idx2) in entry.meeples" :key="idx2">
						<img class="meepleImg" :src="view.getImage('meeple_' + String(meeple))" alt="Meeple" />
					</template>
					<!-- Skills -->
					<template v-for="(skill, idx2) in entry.skills" :key="idx2">
						<img class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" alt="Skill" />
					</template>
					<!-- Resources -->
					<template v-for="(resource, idx2) in entry.resources" :key="idx2">
						<img class="resImg" :src="view.getImage('res_' + String(resource))" alt="Res" />
					</template>
					<!-- Cabins -->
					<template v-for="(cabin, idx2) in entry.cabins" :key="idx2">
						<img class="cabinImg" :src="view.getImage('cabin')" alt="Cabin" />
					</template>
					<!-- Contracts -->
					<div v-for="contractNum in entry.contractNum" :key="contractNum" class="contractOnBoatDiv">
						<svg viewBox="77 131.5 55.5 34" class="contractSVG">
							<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage('c_back')" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
							<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
						</svg>
					</div>
					<br />
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_CHOSEN_WINTER_TILES -->
	<template v-if="entry[0] === rf.HIST_CHOSEN_WINTER_TILES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b>
					<u>Chosen Winter Tiles</u>
				</b>
				<br />
				<template v-if="computedEntry3.chosenCount.length > 0">
					<span v-for="(chosenAmount, playerIndex) in computedEntry3.chosenCount" :key="playerIndex" class="mainEntryPlayer" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour), color: personal.getCorrectedColourText(store.players[playerIndex].colour) }">{{ store.players[playerIndex].displayName }} ({{ chosenAmount }})</span>
					<br/>
				</template>
				<span v-for="(tileID, idx) in computedEntry3.chosenWinterTiles" :key="idx">
					{{ rf.ALL_TILES.find((t) => t.tileID.includes(tileID)).name[0] }}
					<br />
				</span>
			</div>
		</div>
	</template>

	<!-- HIST_COLLECT_VILLAGE_MEEPLES-->
	<template v-if="entry[0] === rf.HIST_COLLECT_VILLAGE_MEEPLES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b><u>Collected Workers on Village Tiles</u></b>
				<br />
				<template v-for="(dataArrays, playerIndex) in entry[3]" :key="playerIndex">
					<span class="mainEntryPlayer" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour), color: personal.getCorrectedColourText(store.players[playerIndex].colour) }">{{ store.players[playerIndex].displayName }}</span>
					<template v-if="dataArrays.length === 0">No workers in village</template>
					<template v-else>
						<template v-for="(recoveryArray, idx) in dataArrays" :key="idx">
							{{ getTileNamwFromTileID(recoveryArray[0]) }}:
							<img v-for="(meeple, idx2) in recoveryArray.slice(1)" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
							<span v-if="idx !== dataArrays.length - 1">,</span>
						</template>
					</template>
					<br />
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_COLLECT_OUTBID_MEEPLES-->
	<template v-if="entry[0] === rf.HIST_COLLECT_OUTBID_MEEPLES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b><u>Collected Outbid Workers</u></b>
				<br />
				<template v-for="(dataArrays, playerIndex) in entry[3]" :key="playerIndex">
					<span class="mainEntryPlayer" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour), color: personal.getCorrectedColourText(store.players[playerIndex].colour) }">{{ store.players[playerIndex].displayName }}</span>
					<template v-if="dataArrays.length === 0">No outbid workers</template>
					<template v-else>
						<template v-for="(recoveryArray, idx) in dataArrays" :key="idx">
							{{ getTileNamwFromTileID(recoveryArray[0]) }}:
							<img v-for="(meeple, idx2) in recoveryArray[1]" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
							<span v-if="idx !== dataArrays.length - 1">,</span>
						</template>
					</template>
					<br />
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_COLLECT_SEASON_TILES -->
	<template v-if="entry[0] === rf.HIST_COLLECT_SEASON_TILES">
		<div class="log separator" :class="{ selectableHistory: store.viewSettings.showReplay }" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				<b><u>Collected Village Tiles</u></b>
				<br />
				<template v-for="(dataArrays, playerIndex) in entry[3]" :key="playerIndex">
					<span class="mainEntryPlayer" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour), color: personal.getCorrectedColourText(store.players[playerIndex].colour) }">{{ store.players[playerIndex].displayName }}</span>
					<template v-if="dataArrays.length === 0">No Collected Tiles</template>
					<template v-else>
						<template v-for="(wonTileArray, idx) in dataArrays" :key="idx">
							<template v-if="wonTileArray.length > 1">
								{{ getTileNamwFromTileID(wonTileArray[0]) }}
								<img v-for="(meeple, idx2) in wonTileArray[1]" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
								<span v-if="idx !== dataArrays.length - 1">,</span>
							</template>
							<template v-else>
								<span v-if="idx !== dataArrays.length - 1">{{ getTileNamwFromTileID(wonTileArray[0]) }},</span>
								<span v-else>{{ getTileNamwFromTileID(wonTileArray[0]) }}</span>
							</template>
						</template>
					</template>
					<br />
				</template>
			</div>
		</div>
	</template>

	<!-- HIST_NEW_CONTRACTS -->
	<template v-if="entry[0] === rf.HIST_NEW_CONTRACTS">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry">
				New Contracts
				<br />
				<div v-for="(contract_id, idx) in entry[3]" :key="idx" class="contractDiv">
					<svg viewBox="77 131.5 55.5 34" class="contractSVG">
						<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage(rf.ALL_CONTRACTS.find((c) => c.id === contract_id).gfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
						<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
					</svg>
				</div>
			</div>
		</div>
	</template>

	<!-- REWIND -->
	<template v-if="entry[0] === rf.HIST_REWIND">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">
				<span v-if="entry[1] >= 0">Game rewound to here by {{ store.players[entry[1]].name }}</span>
				<span v-else>Game rewound to here by Admin</span>
			</div>
		</div>
	</template>

	<!-- RESIGN -->
	<template v-if="entry[0] === rf.HIST_RESIGN">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} Resigns</div>
		</div>
	</template>

	<!-- KICKOUT -->
	<template v-if="entry[0] === rf.HIST_KICKOUT">
		<div class="log">
			<div class="header">
				<span>{{ getTimeString(entry[2]) }}</span>
			</div>
			<div class="mainEntry rewind">{{ entry[3][0] }} was kicked out</div>
		</div>
	</template>

	<!-- *********************************************************** -->
	<!-- *************************** PLAYER ENTRIES **************** -->
	<!-- BID ON TILE -->
	<template v-if="entry[0] === rf.HIST_BID_ON_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					<template v-if="computedEntry3.fromSupply.length > 0">
						<b><u>Bids From Supply</u></b>
						<br />
						<img v-for="(meeple, idx) in computedEntry3.fromSupply" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
						<br />
					</template>
					<template v-if="computedEntry3.movedMeeples.length > 0">
						<template v-for="(movedMeeples, idx) in computedEntry3.movedMeeples" :key="idx">
							<b>
								<u>Bids From {{ getTileNameFromTile_id(movedMeeples[0]) }}</u>
							</b>
							<br />
							<img v-for="(meeple, idx2) in movedMeeples.slice(1)" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
						</template>
					</template>
				</div>
			</div>
		</div>
	</template>

	<!-- ACT ON TILE -->
	<template v-if="entry[0] === rf.HIST_ACT_ON_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					<template v-if="computedEntry3.fromSupply.length > 0">
						<b><u>Used From Supply</u></b>
						<br />
						<img v-for="(meeple, idx) in computedEntry3.fromSupply" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
						<br />
					</template>
					<template v-if="computedEntry3.movedMeeples.length > 0">
						<template v-for="(movedMeeples, idx) in computedEntry3.movedMeeples" :key="idx">
							<b>
								<u>Used From {{ getTileNameFromTile_id(movedMeeples[0]) }}</u>
							</b>
							<br />
							<img v-for="(meeple, idx2) in movedMeeples.slice(1)" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
						</template>
					</template>
				</div>
				<br />
			</div>
			<!-- ACTION RESOLUTION -->
			<div classs="actionResolutionDiv">
				<template v-if="computedEntry3.usedSorcerer">
					Uses: {{ computedEntry3.chosenTileName }}
					<br />
				</template>
				<template v-if="computedEntry3.action === rf.ACT_TILE_GET_RES">
					Received:
					<img v-for="(res, idx) in computedEntry3.incomingRes" :key="idx" class="resImg" :src="view.getImage('res_' + res)" />
					&nbsp;on {{ computedEntry3.resTileName }} {{ computedEntry3.boat7Atext }}
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_GET_RANDOM_MEEPLE">
					Received:
					<img v-for="(colour, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + colour)" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_EXCHANGE_MEEPLE_MANUAL">
					Exchanged:
					<img v-for="(colour, idx) in computedEntry3.outgoingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + colour)" />
					for
					<img v-for="(colour, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + colour)" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_EXCHANGE_SKILL_FOR_SKILL">
					Exchanged:
					<img v-for="(skill, idx) in computedEntry3.outgoingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
					for
					<img v-for="(skill, idx) in computedEntry3.incomingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_SKILL_FOR_MEEPLE">
					Exchanged:
					<img v-for="(skill, idx) in computedEntry3.outgoingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
					for
					<img v-for="(colour, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + colour)" />
				</template>

				<template v-else-if="computedEntry3.action === rf.ACT_TILE_GET_MEEPLE_AND_OR_SKILL">
					Received:
					<img v-for="(colour, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + colour)" />
					<img v-for="(skill, idx) in computedEntry3.incomingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
				</template>

				<template v-else-if="computedEntry3.action === rf.ACT_TILE_GET_RANDOM_SKILL_TILE">
					Received:
					<img v-for="(skill, idx) in computedEntry3.incomingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL">
					<!-- if upgraded, get all, otherwise get 1  -->
					Received:
					<img v-for="(res, idx) in computedEntry3.incomingRes" :key="idx" class="resImg" :src="view.getImage('res_' + res)" />
					&nbsp;on {{ computedEntry3.resTileName }} {{ computedEntry3.boat7Atext }}
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_SKILL_FOR_RES">
					Used:
					<img class="skillTileImg" :src="view.getImage('skillTile_' + computedEntry3.usedSkillTile)" />
					Received:
					<img v-for="(res, idx) in computedEntry3.incomingRes" :key="idx" class="resImg" :src="view.getImage('res_' + res)" />
					&nbsp;on {{ computedEntry3.resTileName }} {{ computedEntry3.boat7Atext }}
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO">
					Exchanges:
					<img v-for="(meeple, idx) in computedEntry3.outgoingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
					from
					<b>
						<span v-if="computedEntry3.meepleSource === -1"><b>their supply</b></span>
						<span v-else>{{ rf.ALL_TILES.find((tile) => tile.id === computedEntry3.meepleSource).name[0] }}</span>
					</b>
					for
					<img v-for="(meeple, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_CONTRACT_OR_AND_ITEMS">
					Received:
					<template v-if="computedEntry3.incomingRes.length > 0">
						<img v-for="(res, idx) in computedEntry3.incomingRes" :key="idx" class="resImg" :src="view.getImage('res_' + res)" />
						on {{ computedEntry3.resTileName }} {{ computedEntry3.boat7Atext }}
					</template>
					<img v-for="(skill, idx) in computedEntry3.incomingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
					<div v-if="computedEntry3.newContractGfx !== ''" class="contractDiv">
						<svg viewBox="77 131.5 55.5 34" class="contractSVG">
							<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage(computedEntry3.newContractGfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
							<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
						</svg>
					</div>
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_SKILL_FOR_GREEN">
					Exchanged:
					<img v-for="(skill, idx) in computedEntry3.outgoingSkillTiles" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + String(skill))" />
					for
					<img v-for="(meeple, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_GET_CONTRACT">
					Received:
					<div v-for="(contractGfx, idx) in computedEntry3.newContractGfxs" :key="idx" class="contractDiv">
						<svg viewBox="77 131.5 55.5 34" class="contractSVG">
							<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage(contractGfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
							<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
						</svg>
					</div>
				</template>
				<template v-else-if="computedEntry3.action === rf.ACT_TILE_MOVE_AND_UPGRADE">
					<template v-if="computedEntry3.movedResArr.length > 0">
						<b>Moves:&nbsp;</b>
						<template v-for="(moveData, idx) in computedEntry3.movedResArr" :key="idx">
							<img class="resImg" :src="view.getImage('res_' + moveData.res)" />
							from {{ getTileNamwFromTileID(moveData.fromTileID) }}
							to
							{{ getTileNamwFromTileID(moveData.toTileID) }} &nbsp;
						</template>
						<br />
					</template>
					<template v-if="computedEntry3.upgradedTileArr.length > 0">
						<b>Upgrades:&nbsp;</b>
						<template v-for="(upgradeData, idx) in computedEntry3.upgradedTileArr" :key="idx">
							{{ rf.ALL_TILES.find((x) => x.tileID.includes(upgradeData.tileID)).name[0] }}
							with
							<template v-if="upgradeData.meeplesUsed.length > 0">
								<img v-for="(meeple, idx2) in upgradeData.meeplesUsed" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
							</template>
							<template v-if="upgradeData.skillsUsed.length > 0">
								<img v-for="(skillTile, idx2) in upgradeData.skillsUsed" :key="idx2" class="skillTileImg" :src="view.getImage('skillTile_' + skillTile)" />
							</template>
							<template v-if="upgradeData.resUsed.length > 0">
								<img v-for="(res, idx2) in upgradeData.resUsed" :key="idx2" class="resImg" :src="view.getImage('res_' + res)" />
							</template>
							&nbsp;
						</template>
					</template>
					<template v-if="computedEntry3.extensionsArr.length > 0">
						<b>Adds Extension:&nbsp;</b>
						<template v-for="(extensionData, idx) in computedEntry3.extensionsArr" :key="idx">
							<img class="extensionImg" :src="view.getImage(extensionData.extension_gfx)" />
							{{ rf.ALL_TILES.find((x) => x.id === extensionData.tile_id).name[1] }}
							with
							<template v-if="extensionData.meeplesUsed.length > 0">
								<img v-for="(meeple, idx2) in extensionData.meeplesUsed" :key="idx2" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
							</template>
							<template v-if="extensionData.skillsUsed.length > 0">
								<img v-for="(skillTile, idx2) in extensionData.skillsUsed" :key="idx2" class="skillTileImg" :src="view.getImage('skillTile_' + skillTile)" />
							</template>
							<template v-if="extensionData.resUsed.length > 0">
								<img v-for="(res, idx2) in extensionData.resUsed" :key="idx2" class="resImg" :src="view.getImage('res_' + res)" />
							</template>
							&nbsp;
						</template>
					</template>
				</template>
			</div>
		</div>
	</template>

	<!-- EXCHANGE CONTRACT -->
	<template v-if="entry[0] === rf.HIST_EXCHANGE_CONTRACT_AUTO">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			Exchanges:
			<div class="contractDiv">
				<svg viewBox="77 131.5 55.5 34" class="contractSVG">
					<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage(rf.ALL_CONTRACTS.find((x) => x.id === entry[3][0]).gfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
					<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
				</svg>
			</div>
			for
			<template v-if="entry[3][1] === 0">
				<img class="meepleImg" :src="view.getImage('meeple_' + entry[3][2])" />
			</template>
			<template v-if="entry[3][1] === 1">
				<img class="skillTileImg" :src="view.getImage('skillTile_' + entry[3][2])" />
			</template>
			<template v-if="entry[3][1] === 2">
				<img class="resImg" :src="view.getImage('res_' + entry[3][2])" />
			</template>
		</div>
	</template>

	<!-- PASSES -->
	<template v-if="entry[0] === rf.HIST_PASS_TURN">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			Passes
		</div>
	</template>

	<!-- Keyside Promo Boat Resources -->
	<template v-if="entry[0] === rf.HIST_KEYSIDE_BOAT_INCOME">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			Gains from Winter Boat
			<b>Keyside</b>
			<br />
			<img v-for="i in 3" :key="i" class="resImg" :src="view.getImage('res_0')" />
			<img v-for="i in 3" :key="i" class="resImg" :src="view.getImage('res_1')" />
			<img v-for="i in 3" :key="i" class="resImg" :src="view.getImage('res_2')" />
			<img v-for="i in 3" :key="i" class="resImg" :src="view.getImage('res_3')" />
		</div>
	</template>

	<!-- COLLECTS BOAT RESOURCES -->
	<template v-if="entry[0] === rf.HIST_COLLECT_BOAT_RESOURCES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" :upgradedProp="computedEntry3.upgraded" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					<b><u>Collects</u></b>
					<br />
					<!-- Meeples -->
					<img v-for="(meeple, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
					<!-- Skills -->
					<template v-if="computedEntry3.incomingSkills.length > 0">
						<br />
						<img v-for="(skill, idx) in computedEntry3.incomingSkills" :key="idx" class="skillTileImg" :src="view.getImage('skillTile_' + skill)" />
					</template>
					<!-- Green meeples -->
					<template v-if="computedEntry3.incomingGreenMeeples > 0">
						<br />
						<img v-for="(meeple, idx) in computedEntry3.incomingGreenMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_green')" />
					</template>
					<!-- Cabins -->
					<template v-if="computedEntry3.incomingCabins > 0">
						<br />
						<img v-for="(cabin, idx) in computedEntry3.incomingCabins" :key="idx" class="cabinImg" :src="view.getImage('cabin')" />
					</template>
					<!-- Resources -->
					<template v-if="computedEntry3.incomingResources.length > 0">
						<br />
						<img v-for="(res, idx) in computedEntry3.incomingResources" :key="idx" class="resImg" :src="view.getImage('res_' + res)" />
						<template v-if="computedEntry3.boat7atileID >= 0">
							on to
							<b>{{ computedEntry3.boat7atileName }}</b>
							using boat 7a
						</template>
					</template>
					<!-- Contracts -->
					<template v-for="(contractGfx, idx) in computedEntry3.incomingContractsGfx" :key="idx">
						<div class="contractDiv">
							<svg viewBox="77 131.5 55.5 34" class="contractSVG">
								<image width="52.916668" height="31.75" preserveAspectRatio="none" :xlink:href="view.getImage(contractGfx)" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
								<path :d="rf.CONTRACT_PATH_D" class="contractPath" />
							</svg>
						</div>
					</template>
					<!-- Boat 1a -->
					<template v-if="computedEntry3.hasBoat1a === true">
						<br />
						Boat 1a adds 2 random workers at the end of the turn
					</template>
					<!-- Boat 1b-->
					<template v-if="computedEntry3.hasBoat1b === true">
						<span v-if="!computedEntry3.collectedGreenMeeple">
							<br />
							Boat 1b would have given 1 green worker, but there are none left
						</span>

						<span v-else-if="computedEntry3.collectedGreenMeeple">
							<br />
							Boat 1b adds
							<img class="meepleImg" :src="view.getImage('meeple_green')" />
						</span>
					</template>
					<!-- Boat 7b -->
					<template v-if="computedEntry3.hasBoat7b">
						<br />
						Boat 7b adds
						<img class="resImg" :src="view.getImage('res_0')" />
						<img class="resImg" :src="view.getImage('res_1')" />
						<img class="resImg" :src="view.getImage('res_2')" />
					</template>
				</div>
				<br />
			</div>
		</div>
	</template>

	<!-- HIST_COLLECT_BOAT1A_RANDOM_MEEPLES -->
	<template v-if="entry[0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				Boat 1a gives:&nbsp;
				<br />
				<!-- Meeples -->
				<img v-for="(meeple, idx) in computedEntry3.incomingMeeples" :key="idx" class="meepleImg" :src="view.getImage('meeple_' + meeple)" />
				<br />
			</div>
		</div>
	</template>

	<!-- HIST_REPLACE_SEA_BASTION_2 -->
	<template v-if="entry[0] === rf.HIST_REPLACE_SEA_BASTION_2">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" :upgradedProp="computedEntry3.upgraded" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					<b>
						Replaces Sea Bastion II
						<br />
						with
						<br />
						{{ computedEntry3.newName }}
					</b>
				</div>
				<br />
			</div>
		</div>
	</template>

	<!-- HIST_COLLECT_BOAT_TILE -->
	<template v-if="entry[0] === rf.HIST_COLLECT_BOAT_TILE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" :upgradedProp="computedEntry3.upgraded" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					<b><u>Collects boat tile</u></b>
					<br />
					<!-- Boat 1a -->
					<template v-if="computedEntry3.hasBoat1a === true">
						<br />
						Boat 1a adds 2 random workers at the end of the turn
					</template>
					<!-- Boat 1b-->
					<template v-if="computedEntry3.hasBoat1b === true">
						<span v-if="!computedEntry3.collectedGreenMeeple">
							<br />
							Boat 1b would have given 1 green worker, but there are none left
						</span>

						<span v-else-if="computedEntry3.collectedGreenMeeple">
							<br />
							Boat 1b adds
							<img class="meepleImg" :src="view.getImage('meeple_green')" />
						</span>
					</template>
					<!-- Boat 7b -->
					<template v-if="computedEntry3.hasBoat7b">
						<br />
						Boat 7b adds
						<img class="resImg" :src="view.getImage('res_0')" />
						<img class="resImg" :src="view.getImage('res_1')" />
						<img class="resImg" :src="view.getImage('res_2')" />
					</template>
					<!-- KF 2 -->
					<template v-if="computedEntry3.keyflower2goldIncome">
						<br />
						Keyflower II gives
						<img class="resImg" :src="view.getImage('res_3')" />
						<img class="resImg" :src="view.getImage('res_3')" />
						<img class="resImg" :src="view.getImage('res_3')" />
						<template v-if="computedEntry3.boat7atileID >= 0">
							<br />
							on to
							<b>{{ computedEntry3.boat7atileName }}</b>
							using boat 7a
						</template>
					</template>
				</div>
				<br />
			</div>
		</div>
	</template>

	<!-- VILLAGE EXPANSION -->
	<template v-if="entry[0] === rf.HIST_VILLAGE_EXPANSION">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<template v-if="entry[3].length > 0">
				<b>Expands village:</b>
				<template v-for="(tileID, idx) in entry[3]" :key="idx">
					<span v-if="idx !== 0">,</span>
					{{ getTileNameForVillageExpansion(tileID) }}
				</template>
			</template>
			<template v-else>
				<b>No New Tiles To Expand Village</b>
			</template>
		</div>
	</template>

	<!-- HIST_FREE_UPGRADE -->
	<template v-if="entry[0] === rf.HIST_FREE_UPGRADE">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" :upgradedProp="computedEntry3.upgraded" />
				</div>
				<div class="rightDiv meepleSourceDiv">Upgrades for Free using Flipper</div>
				<br />
			</div>
		</div>
	</template>

	<!-- HIST_FREE_EXTENSION -->
	<template v-if="entry[0] === rf.HIST_FREE_EXTENSION">
		<div class="log mainEntry selectableHistory" @click="clickedHistoryEntry(entry[0], entry[3], entry_ID)">
			<div class="header">
				<span>
					{{ getTimeString(entry[2]) }}
				</span>
				<div class="topRightNameDiv">
					<span class="mainEntryPlayer topRightNameSpan" :style="{ backgroundColor: personal.getCorrectedColourHex(store.players[entry[1]].colour), color: personal.getCorrectedColourText(store.players[entry[1]].colour) }">{{ store.players[entry[1]].displayName }}</span>
				</div>
			</div>
			<div class="container">
				<div class="leftDiv">
					<HistoryHex :tileID_prop="entry[3][0]" :upgradedProp="computedEntry3.upgraded" />
				</div>
				<div class="rightDiv meepleSourceDiv">
					Adds extension for free using Flipper II
					<br />
					<img class="extensionImg" :src="view.getImage(computedEntry3.extensionGfx)" />
				</div>
				<br />
			</div>
		</div>
	</template>
</template>

<style scoped>
.playerScoreSummaryDiv {
	border: 1px solid white;
	display: inline-block;
	font-size: 15px;
	font-weight: bolder;
	margin: 4px;
	padding: 0px;
}

.log {
	direction: ltr;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 3px 3px 3px 3px;
	background-size: 35px 34px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
	z-index: 30;
}

.log .header {
	font-size: 13px;
	/*font-size: 0.8em;*/
}

.mainEntry {
	line-height: 25px;
	position: relative;
}

.topRightNameDiv {
	position: absolute;
	top: 0;
	right: 0;
	/*background-color: #2196f3;*/
	font-size: 15px;
	font-weight: bolder;
	text-align: center;
	width: 306px;
	height: 35px;
	white-space: nowrap; /* Prevent text from wrapping */
	overflow: hidden; /* Hide any overflowing text */
	text-overflow: ellipsis; /* Display an ellipsis (...) when text overflows */
}

.topRightNameSpan {
	display: inline-block;
	max-width: 300px;
	white-space: nowrap; /* Prevent text from wrapping */
	overflow: hidden; /* Hide any overflowing text */
	text-overflow: ellipsis; /* Display an ellipsis (...) when text overflows */
}

.selectableHistory:hover {
	border: 1px solid yellow;
}

.log .new_turn {
	background-color: #000;
	text-align: center;
	color: #fff;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log .new_turn a {
	color: #2196f3;
}

.log .rewind {
	background-color: #d4eafd;
	text-align: center;
	color: #000;
	font-weight: bold;
	font-size: 1.2em;
	padding: 8px;
}

.log h4 {
	text-align: center;
}

.log.separator {
	padding: 3px;
}

.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

.container {
	display: flex; /* Use flexbox to align children */
}

.leftDiv {
	width: 150px; /* Set a fixed width for the left div */
	padding: 0px;
	background-color: #d4eafd;
}

.rightDiv {
	flex: 1; /* Make the right div take up remaining space */
	background-color: #d4eafd;
}

.meepleSourceDiv {
	text-align: center;
}

.meepleImg {
	width: 35px;
	height: 35px;
	filter: drop-shadow(1px 1px 0 black) drop-shadow(-1px 1px 0 black) drop-shadow(-1px -1px 0 black) drop-shadow(1px -1px 0 black);
	vertical-align: middle;
}

.cabinImg {
	width: 35px;
	height: 35px;
	filter: drop-shadow(1px 1px 0 white) drop-shadow(-1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white);
	vertical-align: middle;
	margin-bottom: 5px;
}

.resImg {
	height: 35px;
	vertical-align: middle;
}

.skillTileImg {
	vertical-align: middle;
	height: 35px;
	border: 1px solid black;
	margin-top: 5px;
	margin-right: 5px;
}

.contractDiv {
	display: inline-block;
	vertical-align: middle;
	height: 50px;
	width: 80px;
	position: relative;
	margin-right: 5px;
}
.contractOnBoatDiv {
	display: inline-block;
	vertical-align: middle;
	height: 33px;
	width: 53px;
	position: relative;
	margin-right: 5px;
}
.contractSVG {
	width: 100%;
}
.contractPath {
	fill: black;
	fill-opacity: 0;
	stroke: black;
	stroke-width: 2;
	stroke-linecap: butt;
	stroke-linejoin: miter;
	stroke-opacity: 1;
}
.extensionImg {
	width: 41px;
	height: 41px;
	box-sizing: border-box;
	margin-right: 1.5px;
	margin-left: 1.5px;
	margin-bottom: 5px;
	border: 2px solid black;
	vertical-align: middle;
}
</style>
