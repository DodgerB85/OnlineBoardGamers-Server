/**
 * Short English line for one engine log entry {y, seat, key, args} (see engine/state.js log()).
 * The engine never logs poison or unrevealed bids, so there is nothing hidden to leak here.
 */

import { CHARTERS, DISPENSATIONS, INGREDIENT_INFO, OVERFLOW_VENUES, RECIPES, SCARES, TESTIMONIALS, VENUES } from "./engine/cards.js"
import { ICONS } from "../components/board/icons.js"

const WARNING_REASON = {
	reliability: "failed Reliability check",
	restitution: "unpaid restitution",
	inspection: "Inspection Notice",
	scare: "Scare",
	expose: "exposed",
	levy: "unpaid levies",
	administration: "Administration",
	firstPlayer: "First Player",
}

const SALE_VERB = {
	solo: "sold",
	exchange: "won the Pricing Exchange and sold",
	extra: "made an extra sale",
	reoffer: "sold a re-offered potion",
	desperate: "made a desperate extra sale",
}

// Registry icon for an entry (PAP/UI_INFORMATION.md): { art, label } from ICONS, or null when nothing fits.
export function logIcon(entry) {
	const { key, args = {} } = entry
	switch (key) {
		case "scare": return ICONS.scare
		case "firstPlayer": return ICONS.firstPlayer
		case "watch": return ICONS.watch
		case "administered": return ICONS.administration
		case "franchise": return ICONS.franchise
		case "levies": case "inspection": return ICONS.levy
		case "spoiled": case "dump": return ICONS.kettleSlot
		case "condemned": case "condemnation": case "warning": return ICONS.warning
		case "declined": case "fireWard": return ICONS.reputation
		case "choseRecipes": case "craft": return ICONS.tile("kettle")
		case "sale": case "undercut": case "exchange": return ICONS.cash
		case "pitchBlocked": case "pitchPoisoned": return ICONS.hype
		case "backedFutures": return ICONS.lockedHype
		case "charterPassed": case "demonstration": return ICONS.boone
		case "seal": case "contributed": case "bylaw": return ICONS.seal
		case "reviewCalled": case "reviewContribution": case "reviewSlotSpent": case "rally": return ICONS.review
		case "testimonial": return ICONS.testimonial
		case "expose": return ICONS.tolerance
		case "pamphlet": return args.mode === "retarget" ? ICONS.scare : ICONS.tolerance
		case "bribe": return ICONS.paper("bribe")
		case "favor": return ICONS.paper("favor")
		case "expedite": return ICONS.paper("expedite")
		case "sabotage": case "sabotageWarded": case "sabotageRedirected": return ICONS.paper("sabotage")
		default: return null
	}
}

function who(s, seat) {
	return seat === null || seat === undefined || !s.players[seat] ? "Someone" : s.players[seat].name
}

function venueName(id) {
	const v = VENUES.find(x => x.id === id) || OVERFLOW_VENUES.find(x => x.id === id)
	return v ? v.name : id
}

function crowns(n) {
	return n + (n === 1 ? " Crown" : " Crowns")
}

export function logText(entry, s) {
	const { key, seat, args = {} } = entry
	const w = seat => who(s, seat)
	switch (key) {
		case "yearStart": return "Year " + args.year + " begins"
		case "scare": return "Scare: " + SCARES[args.scare].name + " " + SCARES[args.scare].text
		case "gameOver": return "The game is over"
		case "choseRecipes": return w(seat) + " chose " + args.recipes.map(id => RECIPES[id].name).join(" and ") + " as starting recipes"
		case "firstPlayer": return w(seat) + " is First Player"
		case "watch": return w(seat) + " is on Watch"
		case "levies": return w(seat) + " paid " + crowns(args.paid) + " in levies"
		case "spoiled": return w(seat) + " lost " + args.count + (args.count === 1 ? " potion" : " potions") + " to spoilage"
		case "condemned": return w(seat) + " has " + args.excess + " excess Warning" + (args.excess === 1 ? "" : "s") + " to settle"
		case "condemnation": return w(seat) + (args.choice === "pay" ? " paid to clear excess Warnings" : " discarded a Journeyman to clear excess Warnings")
		case "favor": return w(seat) + " played Favor: " + ({ cancel: "cancelled a Warning", order: "changed the audit order", restitution: "arranged restitution" }[args.mode] || args.mode)
		case "expedite": return w(seat) + " played Expediting Fee: " + ({ skipFee: "skipped a fee", last: "pushed a rival to resolve last" }[args.mode] || args.mode)
		case "craft": return w(seat) + " crafted " + (RECIPES[args.recipe] ? RECIPES[args.recipe].name : args.recipe) + (args.disp ? " with " + DISPENSATIONS[args.disp].name : "")
		case "sale": return w(seat) + " " + (SALE_VERB[args.kind] || "sold") + " at " + venueName(args.venue) + " for " + crowns(args.price)
		case "undercut": return w(seat) + " undercut every rival at " + venueName(args.venue)
		case "exchange": return "Pricing Exchange at " + venueName(args.venue) + ": " + w(args.winner) + " won. Bids: " + args.bids.map(b => w(b.seat) + " " + crowns(b.price) + " and " + b.hype + " Hype").join("; ")
		case "declined": return w(seat) + " missed the customer at " + venueName(args.venue) + " (-1 Reputation)"
		case "pitchBlocked": return "A poisoned pitch blocked " + w(seat) + "'s sale at " + venueName(args.venue)
		case "dump": return w(seat) + " dumped a potion"
		case "sabotageWarded": return w(seat) + " sabotaged " + w(args.target) + ", but a Fire-Ward stopped it"
		case "sabotageRedirected": return w(seat) + " sabotaged " + w(args.target) + ", but a Whistling Cork turned it back on " + w(seat)
		case "sabotage": return w(seat) + " sabotaged a potion of " + w(args.target)
		case "fireWard": return w(seat) + " warded a potion against Sabotage"
		case "charterPassed": return w(seat) + " completed " + CHARTERS[args.charter].name + ": " + venueName(CHARTERS[args.charter].venue) + " gets a Boone"
		case "seal": return w(seat) + " founded the Seal at " + venueName(args.venue)
		case "reviewContribution": return "The frozen " + w(seat) + "'s contribution went to " + CHARTERS[args.charter].name
		case "reviewCalled": return w(seat) + " called a Public Review"
		case "rally": return w(seat) + " rallied to the Review"
		case "reviewSlotSpent": return w(seat) + " spent their Council contribution on the Review"
		case "contributed": return w(seat) + " contributed to " + CHARTERS[args.charter].name
		case "bylaw": return "The Bylaw vote opened " + CHARTERS[args.charter].name
		case "inspection": return w(seat) + " served an Inspection Notice on " + w(args.seat)
		case "administered": return w(seat) + " took " + INGREDIENT_INFO[args.kind].name + " under Administration"
		case "pitchPoisoned": return w(seat) + " poisoned the pitch and spent Hype"
		case "franchise": return w(seat) + " bought a Franchise"
		case "expose": return w(seat) + " exposed " + w(args.seat) + " at " + venueName(args.venue) + (args.hit ? ": over tolerance" : ": came up clean")
		case "backedFutures": return w(seat) + " backed a potion with Futures"
		case "bribe": return w(seat) + " used a Bribe to move the Panic to " + venueName(args.venue)
		case "pamphlet": return w(seat) + " used a Pamphlet: " + (args.mode === "retarget" ? "the Panic moved" : "a rival's next sale must pass a Reliability check")
		case "testimonial": return w(seat) + " planted " + TESTIMONIALS[args.testimonial].name
		case "demonstration": return w(seat) + " ran a Demonstration: a customer arrived at " + venueName(args.venue)
		case "warning": return w(seat) + " takes a Warning (" + (WARNING_REASON[args.reason] || args.reason) + ")"
		default: return key
	}
}
