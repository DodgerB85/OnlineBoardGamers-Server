// Shared look for the board: one seat colour, one star palette, one Dispensation family palette.
import { INGREDIENTS, INGREDIENT_INFO } from "../../js/engine/cards.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"

export const STAR_COLOURS = ["", "#7f9b5c", "#3f7fb5", "#8a4fa0", "#c9962b"]

// Venue mood, as on VenueCard.
export const MOOD_COLOURS = { calm: "#bbbbbb", desperate: "#f5c77e", panicked: "#e57373" }

export const FAMILY = {
	swapper: { name: "Swapper", colour: "#1f7f86", text: "swaps one ingredient for another" },
	potency: { name: "Potency", colour: "#d9731a", text: "+1 potency" },
	preference: { name: "Preference", colour: "#7a9a1e", text: "delights one venue" },
	danger: { name: "Danger", colour: "#5b2347", text: "risky: scares, fails or spoils" },
}

export const FAMILY_LEGEND = Object.values(FAMILY).map(f => f.name + ": " + f.text).join(". ")

// The player's colour from the lobby (same swatch PlayerTable shows), read reactively.
export function seatColour(seat) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const hex = personal.getCorrectedColourHex(store.players[seat] && store.players[seat].colour)
	return hex === "none" ? "#888888" : hex
}

export function costText(cost) {
	const parts = INGREDIENTS.filter(k => cost[k] > 0).map(k => cost[k] + " " + INGREDIENT_INFO[k].name)
	return parts.length ? parts.join(", ") : "free"
}
