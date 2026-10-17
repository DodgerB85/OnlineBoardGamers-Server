// Helpers for the action panel: card labels, wants text, and the craft form payload.
import { CUSTOMERS, INGREDIENT_INFO, RECIPES } from "../../js/engine/cards.js"
import { venueInfo } from "../../js/engine/state.js"

export const venueName = id => venueInfo(id).name

export function wantsText(customerId) {
	const w = CUSTOMERS[customerId].wants
	if (w.type === "any") return "any potion"
	// Star Wants are a minimum potency bar, not an exact star match.
	if (w.type === "stars") return `potency ${w.min || w.exact}+`
	if (w.type === "recipes") return w.ids.map(id => RECIPES[id].name).join(" or ")
	return `a potion containing ${INGREDIENT_INFO[w.kind].name}`
}

export const newCraft = () => ({ recipe: "", disp: "", poison: 0, poisonPay: [], swap: 0, swapPay: [] })

// Engine fields for a craft. swap and swapPay are only sent when the Dispensation uses them.
export function craftPayload(c) {
	const swapper = c.disp === "fieldGradeToadstool" || c.disp === "shamblingQuicksilver"
	const banshee = c.disp === "doomRecycledBanshee" && RECIPES[c.recipe]?.cost.banshee > 0
	return {
		recipe: c.recipe,
		disp: c.disp || null,
		poison: c.poison,
		poisonPay: c.poisonPay.slice(0, c.poison),
		swap: swapper ? c.swap : 0,
		...(banshee ? { swapPay: c.swapPay.slice(0, 2) } : {}),
	}
}

// What is still missing before a craft can go, or "" when it is ready.
export function craftWhy(c) {
	const recipe = RECIPES[c.recipe]
	if (!recipe) return "Choose a recipe"
	const pay = c.poisonPay.slice(0, c.poison)
	if (pay.length !== c.poison || pay.some(k => !k)) return "Pay every Poison marker with an ingredient"
	const banshee = c.disp === "doomRecycledBanshee" && recipe.cost.banshee > 0
	return banshee && !(c.swapPay[0] && c.swapPay[1]) ? "Choose the two ingredients that replace the Banshee" : ""
}

export const craftReady = c => craftWhy(c) === ""
