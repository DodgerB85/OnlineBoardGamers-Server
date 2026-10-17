// One concept, one icon, everywhere (board, prompts, history log). See PAP/UI_INFORMATION.md.
// `art` is the file in src/assets/art/ (without .svg); `label` is the tooltip / aria text.
import { APPARATUS, PAPERWORK, TILES, INGREDIENT_INFO } from "../../js/engine/cards.js"

// One knob for every icon on the page (owner asked for bigger icons everywhere).
export const ICON_SCALE = 1.4

export const ICONS = {
	cash: { art: "crown", label: "Cash (Crowns)" },
	recognized: { art: "vp", label: "Recognized Profit (Crowns of profit, not VP)" },
	hype: { art: "hype", label: "Hype" },
	lockedHype: { art: "hype-locked", label: "Locked Hype" },
	reputation: { art: "reputation", label: "Reputation" },
	warning: { art: "warning", label: "Warning" },
	poison: { art: "poison", label: "Poison markers" },
	levy: { art: "levy", label: "Compliance Levy owed" },
	kettleSlot: { art: "potion", label: "Kettle slot" },
	anchor: { art: "anchor", label: "Anchor: the most this customer pays" },
	overhead: { art: "overhead", label: "Serving overhead per sale" },
	tolerance: { art: "tolerance", label: "Poison tolerance" },
	founderCut: { art: "founder-cut", label: "Founder's Cut (Hype per sale)" },
	boone: { art: "boone", label: "Civic Boone: +1 Hype per sale, +1 customer slot" },
	seal: { art: "seal", label: "Founder's Seal" },
	firstPlayer: { art: "first-player", label: "First Player" },
	watch: { art: "watch", label: "Audit Watch" },
	administration: { art: "administration", label: "Under Administration" },
	franchise: { art: "franchise", label: "Itinerant Franchise this Year" },
	review: { art: "review", label: "Public Review" },
	testimonial: { art: "testimonial", label: "Testimonial" },
	scare: { art: "back-scare", label: "Scare" },
	preference: { art: "preference", label: "Preference" },
	reward: { art: "back-recipe", label: "Reward recipe" },
	tier: tier => ({ art: "cauldron-" + tier, label: "Cauldron Tier " + tier }),
	staff: rank => ({ art: "staff-" + rank, label: rank[0].toUpperCase() + rank.slice(1) }),
	tile: id => ({ art: "tile-" + id, label: TILES.find(t => t.id === id).name }),
	ingredient: kind => ({ art: kind, label: INGREDIENT_INFO[kind].name }),
	apparatus: id => ({ art: "app-" + id, label: APPARATUS[id].name + ": " + APPARATUS[id].text }),
	paper: id => ({ art: "paper-" + id, label: PAPERWORK[id].name }),
}

// Mood is shape + colour so it survives colour blindness.
export const MOODS = {
	calm: { shape: "●", colour: "#9e9e9e", label: "Calm: pays normally" },
	desperate: { shape: "▲", colour: "#e0a030", label: "Desperate: extra sales at the Anchor" },
	panicked: { shape: "✷", colour: "#d84343", label: "Panicked: +2 Hype, Reliability check" },
}

export function artUrl(name) {
	return new URL(`../../assets/art/${name}.svg`, import.meta.url).href
}
