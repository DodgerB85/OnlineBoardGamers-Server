// Static card data, ported from the printable prototype catalogue (bg-vibes/prototype/cards.js).
// Plain data only: no HTML, no functions. Recipe, customer and scare ids follow the printed numbers.

export const INGREDIENTS = ['crystal', 'toad', 'quick', 'banshee']

export const INGREDIENT_INFO = {
	crystal: { name: 'Crystal', sym: '◆', supply: 40 },
	toad: { name: 'Toadstool', sym: '●', supply: 40 },
	quick: { name: 'Quicksilver', sym: '◇', supply: 30 },
	banshee: { name: 'Banshee', sym: '▲', supply: 20 },
}

export const VENUES = [
	{ id: 'workhouse', name: 'Workhouse', anchor: 3, tier: 1, overhead: 1, tolerance: 2, founderCut: 1, overflow: false },
	{ id: 'golem', name: 'Golem Pound', anchor: 5, tier: 1, overhead: 1, tolerance: 2, founderCut: 1, overflow: false },
	{ id: 'lantern', name: 'Lantern & Ledger', anchor: 6, tier: 2, overhead: 1, tolerance: 1, founderCut: 1, overflow: false },
	{ id: 'fever', name: 'Fever Ward', anchor: 7, tier: 3, overhead: 1, tolerance: 1, founderCut: 2, overflow: false },
	{ id: 'odditorium', name: 'Odditorium', anchor: 8, tier: 3, overhead: 2, tolerance: 1, founderCut: 2, overflow: false },
	{ id: 'nobles', name: "Nobles' Ring", anchor: 9, tier: 4, overhead: 3, tolerance: 0, founderCut: 2, overflow: false },
]

export const OVERFLOW_VENUES = [
	{ id: 'overflow1', name: 'Overflow Stall I', anchor: 3, tier: 1, overhead: 1, tolerance: 2, founderCut: 1, overflow: true },
	{ id: 'overflow2', name: 'Overflow Stall II', anchor: 3, tier: 1, overhead: 1, tolerance: 2, founderCut: 1, overflow: true },
]

export const RECIPES = {
	HS1: { id: 'HS1', name: 'Cough-Lock Remover', stars: 1, cost: { crystal: 0, toad: 1, quick: 1, banshee: 0 }, houseSpecial: true, market: false, flavor: 'perennial bestseller' },
	HS2: { id: 'HS2', name: 'The Un-Dampening Tonic', stars: 1, cost: { crystal: 2, toad: 0, quick: 0, banshee: 0 }, houseSpecial: true, market: false, flavor: 'ruined parchment cure' },
	HS3: { id: 'HS3', name: 'Gnome-Scale Cream', stars: 2, cost: { crystal: 1, toad: 1, quick: 0, banshee: 0 }, houseSpecial: true, market: false, flavor: 'rust-proud gardeners' },
	HS4: { id: 'HS4', name: 'Itinerant Alibi', stars: 2, cost: { crystal: 1, toad: 0, quick: 1, banshee: 0 }, houseSpecial: true, market: false, flavor: 'seems elsewhere' },
	HS5: { id: 'HS5', name: 'Certified Levity Draught', stars: 2, cost: { crystal: 0, toad: 0, quick: 0, banshee: 1 }, houseSpecial: true, market: false, flavor: 'floating filing cabinets' },
	HS6: { id: 'HS6', name: 'The Overtime Elixir', stars: 3, cost: { crystal: 0, toad: 2, quick: 1, banshee: 0 }, houseSpecial: true, market: false, flavor: 'chronic insomnia, municipal' },
	M7: { id: 'M7', name: 'Mildew Protest Writ', stars: 2, cost: { crystal: 1, toad: 1, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: 'a liquid that argues' },
	HS8: { id: 'HS8', name: 'Clockwork Laxative for Golems', stars: 2, cost: { crystal: 0, toad: 0, quick: 2, banshee: 0 }, houseSpecial: true, market: true, flavor: '' },
	M9: { id: 'M9', name: 'Audit-Soother', stars: 2, cost: { crystal: 0, toad: 1, quick: 0, banshee: 1 }, houseSpecial: false, market: true, flavor: 'mild sedative for clerks' },
	M10: { id: 'M10', name: 'The Second-Breath Essence', stars: 2, cost: { crystal: 2, toad: 1, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: '' },
	HS11: { id: 'HS11', name: 'Fog-Beard Dye', stars: 1, cost: { crystal: 1, toad: 0, quick: 1, banshee: 0 }, houseSpecial: true, market: true, flavor: '' },
	M12: { id: 'M12', name: 'The Bigger-Print Eyedrops', stars: 3, cost: { crystal: 1, toad: 0, quick: 0, banshee: 1 }, houseSpecial: false, market: true, flavor: '' },
	M13: { id: 'M13', name: 'Pea-Soup Solution', stars: 3, cost: { crystal: 0, toad: 3, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: 'a very thick thing, very legal' },
	M14: { id: 'M14', name: 'The Amenity Sheet', stars: 3, cost: { crystal: 1, toad: 2, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: 'the whole room calms' },
	M15: { id: 'M15', name: "Lodestone's Little Helper", stars: 3, cost: { crystal: 0, toad: 0, quick: 1, banshee: 1 }, houseSpecial: false, market: true, flavor: 'finds that one lost document' },
	M16: { id: 'M16', name: 'The Officially-Bland Linctus', stars: 3, cost: { crystal: 1, toad: 0, quick: 1, banshee: 1 }, houseSpecial: false, market: true, flavor: '' },
	M17: { id: 'M17', name: 'Vault-Foot Glue', stars: 3, cost: { crystal: 2, toad: 0, quick: 0, banshee: 1 }, houseSpecial: false, market: true, flavor: 'for when you must stay put' },
	M18: { id: 'M18', name: 'The Inter-Departmental Memo Wine', stars: 3, cost: { crystal: 0, toad: 1, quick: 2, banshee: 0 }, houseSpecial: false, market: true, flavor: '' },
	M19: { id: 'M19', name: 'Stoneswall; A Suspension', stars: 3, cost: { crystal: 3, toad: 0, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: '' },
	M20: { id: 'M20', name: 'The Feasibility Draught', stars: 3, cost: { crystal: 2, toad: 2, quick: 0, banshee: 0 }, houseSpecial: false, market: true, flavor: '' },
	M21: { id: 'M21', name: 'Pigeon of the Law', stars: 3, cost: { crystal: 1, toad: 1, quick: 1, banshee: 0 }, houseSpecial: false, market: true, flavor: 'a hawk, but prophylactic' },
	M22: { id: 'M22', name: 'The Grievance Elixir', stars: 4, cost: { crystal: 0, toad: 0, quick: 0, banshee: 2 }, houseSpecial: false, market: true, flavor: 'it files itself' },
	M23: { id: 'M23', name: 'Absolute Clarity Cordial', stars: 4, cost: { crystal: 2, toad: 0, quick: 0, banshee: 2 }, houseSpecial: false, market: true, flavor: 'too strong for common use' },
	M24: { id: 'M24', name: 'The Perfectly Inert Panacea', stars: 4, cost: { crystal: 1, toad: 1, quick: 1, banshee: 1 }, houseSpecial: false, market: true, flavor: 'does nothing, perfectly' },
}

export const HOUSE_SPECIALS = ['HS1', 'HS2', 'HS3', 'HS4', 'HS5', 'HS6', 'HS8', 'HS11']

export const MARKET_RECIPES = ['M7', 'HS8', 'M9', 'M10', 'HS11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17', 'M18', 'M19', 'M20', 'M21', 'M22', 'M23', 'M24']

// Printed number ('M22', 'HS1') to its numeric part.
export function recipeNumber(id) {
	return Number(id.replace(/^[A-Z]+/, ''))
}

const STARS = n => ({ type: 'stars', exact: n })
const RECIPE_WANT = (...ids) => ({ type: 'recipes', ids })
const INGREDIENT_WANT = kind => ({ type: 'ingredient', kind })
const ANY = { type: 'any' }

export const CUSTOMERS = {
	N1: { id: 'N1', name: "Duchess de l'Étiquette", venue: 'nobles', mood: 'desperate', preference: 'tasteWealthyQuarter', reward: 'M22', wants: { type: 'stars', min: 2 } },
	N2: { id: 'N2', name: 'Viscount Hark-Again', venue: 'nobles', mood: 'calm', preference: null, reward: 'M7', wants: RECIPE_WANT('HS5', 'HS6') },
	N3: { id: 'N3', name: 'Lady Pulchritude', venue: 'nobles', mood: 'desperate', preference: 'tasteWealthyQuarter', reward: 'M23', wants: STARS(3) },
	N4: { id: 'N4', name: 'The Haunted Baronet', venue: 'nobles', mood: 'calm', preference: 'properlyLicensedDoom', reward: 'M15', wants: INGREDIENT_WANT('banshee') },
	L5: { id: 'L5', name: 'Senior Tallyman', venue: 'lantern', mood: 'desperate', preference: 'charmLanternDistrict', reward: 'M10', wants: RECIPE_WANT('HS2', 'HS1') },
	L6: { id: 'L6', name: 'Ledger-Reader', venue: 'lantern', mood: 'calm', preference: null, reward: 'M9', wants: STARS(1) },
	L7: { id: 'L7', name: 'The Outside Auditor', venue: 'lantern', mood: 'desperate', preference: 'charmLanternDistrict', reward: 'M18', wants: RECIPE_WANT('HS6', 'M9') },
	L8: { id: 'L8', name: 'Junior Clerk', venue: 'lantern', mood: 'calm', preference: null, reward: 'HS11', wants: STARS(1) },
	G9: { id: 'G9', name: 'Foreman Cast-Iron', venue: 'golem', mood: 'desperate', preference: 'favorOfThePit', reward: 'M20', wants: RECIPE_WANT('HS8') },
	G10: { id: 'G10', name: 'Rust-Proud Gardener', venue: 'golem', mood: 'calm', preference: 'favorOfThePit', reward: 'M21', wants: RECIPE_WANT('HS3') },
	G11: { id: 'G11', name: 'The Pile of Sieves', venue: 'golem', mood: 'calm', preference: null, reward: 'M13', wants: INGREDIENT_WANT('toad') },
	G12: { id: 'G12', name: 'An Enthusiastic Golem', venue: 'golem', mood: 'calm', preference: null, reward: 'M14', wants: STARS(1) },
	W13: { id: 'W13', name: 'The Bursar', venue: 'workhouse', mood: 'desperate', preference: null, reward: 'HS8', wants: STARS(2) },
	W14: { id: 'W14', name: 'The Night Shift', venue: 'workhouse', mood: 'desperate', preference: null, reward: 'M12', wants: RECIPE_WANT('HS6') },
	W15: { id: 'W15', name: 'The Pit-Boss', venue: 'workhouse', mood: 'calm', preference: null, reward: 'M17', wants: STARS(1) },
	W16: { id: 'W16', name: 'The Picketer', venue: 'workhouse', mood: 'calm', preference: null, reward: 'M16', wants: ANY },
	F17: { id: 'F17', name: 'Head Nurse Malady', venue: 'fever', mood: 'desperate', preference: null, reward: 'M24', wants: { type: 'stars', min: 2 } },
	F18: { id: 'F18', name: 'The Hypochondriac', venue: 'fever', mood: 'calm', preference: 'properlyLicensedDoom', reward: 'HS4', wants: STARS(1) },
	F19: { id: 'F19', name: 'The Quarantine Clerk', venue: 'fever', mood: 'desperate', preference: null, reward: 'HS2', wants: RECIPE_WANT('M13') },
	F20: { id: 'F20', name: 'The Contagious Baron', venue: 'fever', mood: 'desperate', preference: null, reward: 'M19', wants: STARS(3) },
	O21: { id: 'O21', name: 'Collector Plausible', venue: 'odditorium', mood: 'calm', preference: 'fullMoonTax', reward: 'M22', wants: STARS(3) },
	O22: { id: 'O22', name: 'The Curator of Regrets', venue: 'odditorium', mood: 'desperate', preference: null, reward: 'M23', wants: RECIPE_WANT('M22') }, // owner ruling: no longer Wants its own reward (design doc listed Grievance / Cordial)
	O23: { id: 'O23', name: 'An Undecided Spectator', venue: 'odditorium', mood: 'calm', preference: null, reward: 'HS1', wants: STARS(1) },
	O24: { id: 'O24', name: 'The Last Visitor', venue: 'odditorium', mood: 'desperate', preference: 'properlyLicensedDoom', reward: 'HS11', wants: ANY },
}

export const DISPENSATION_IDS = ['fieldGradeToadstool', 'shamblingQuicksilver', 'doomRecycledBanshee', 'doubleDistilled', 'fullMoonTax', 'gardenGradeAlarm', 'tasteWealthyQuarter', 'charmLanternDistrict', 'favorOfThePit', 'bansheesBlessing', 'whistlingCork', 'properlyLicensedDoom']

export const DISPENSATIONS = {
	fieldGradeToadstool: { id: 'fieldGradeToadstool', name: 'Field-Grade Toadstool', family: 'swapper', text: 'Swap any Toadstool requirement for a Quicksilver. Luxury of abundance.' },
	shamblingQuicksilver: { id: 'shamblingQuicksilver', name: 'Shambling Quicksilver', family: 'swapper', text: 'Swap any Quicksilver requirement for a Crystal. Slower, heavier, stabler.' },
	doomRecycledBanshee: { id: 'doomRecycledBanshee', name: 'Doom-Recycled Banshee', family: 'swapper', text: 'Swap the Banshee requirement for any two other ingredients. The office of Doom accepts returns.' },
	doubleDistilled: { id: 'doubleDistilled', name: 'Double-Distilled', family: 'potency', text: 'Potency +1 (pay 1 extra Crown at craft).' },
	fullMoonTax: { id: 'fullMoonTax', name: 'The Full Moon Tax', family: 'potency', text: 'Potency +1, and potion gains Preference "Nocturnal".' },
	gardenGradeAlarm: { id: 'gardenGradeAlarm', name: 'Garden-Grade Alarm', family: 'potency', text: 'Potency +1 but potion scares the venue (see Scares). Great demand, risky Reliability.' },
	tasteWealthyQuarter: { id: 'tasteWealthyQuarter', name: 'Taste of the Wealthy Quarter', family: 'preference', text: "Potion delights the Nobles' Ring venue." },
	charmLanternDistrict: { id: 'charmLanternDistrict', name: 'Charm of the Lantern District', family: 'preference', text: 'Potion delights the Lantern & Ledger venue.' },
	favorOfThePit: { id: 'favorOfThePit', name: 'Favor of the Pit', family: 'preference', text: 'Potion delights the Golem Pound venue.' },
	bansheesBlessing: { id: 'bansheesBlessing', name: "Banshee's Blessing", family: 'danger', text: "During a Scare, this potion's potency counts double for Customer Score." },
	whistlingCork: { id: 'whistlingCork', name: 'The Whistling Cork', family: 'danger', text: 'Sold to any venue (ignores "wants") but +1 Warning risk on failed Preference. Counterplay: on a Sabotage, redirect it back at the saboteur\'s own Kettle.' },
	properlyLicensedDoom: { id: 'properlyLicensedDoom', name: 'Properly Licensed Doom', family: 'danger', text: 'Passes Reliability checks even with 0 Preference: it is, after all, permitted.' },
}

export const APPARATUS_IDS = ['secondKettle', 'coldRoomRack', 'fractionator', 'invoiceGuillotine', 'loyalOven', 'resonantCopper', 'paperweightPlinth', 'greenThumbPump']

export const APPARATUS = {
	secondKettle: { id: 'secondKettle', name: 'The Second Kettle', text: 'One extra craft action per Year, no staff required.' },
	coldRoomRack: { id: 'coldRoomRack', name: 'Cold-Room Rack', text: 'A second Protect-1 slot (shield one more potion from spoilage each Audit).' },
	fractionator: { id: 'fractionator', name: 'The Fractionator', text: 'Once/year, split 1 ingredient into 2 of a different kind at 1:1.' },
	invoiceGuillotine: { id: 'invoiceGuillotine', name: 'Invoice Guillotine', text: 'Every Pricing Exchange you win pays +1 Crown (processing charge).' },
	loyalOven: { id: 'loyalOven', name: 'The Loyal Oven', text: 'Dispensation-equip costs 1 fewer Crown (Double-Distilled free).' },
	resonantCopper: { id: 'resonantCopper', name: 'Resonant Copper', text: 'Banshee taken at Co-op costs 0 Crowns (instead of 1).' },
	paperweightPlinth: { id: 'paperweightPlinth', name: 'The Paperweight Plinth', text: 'Hold one extra Paperwork card (hand max 5).' },
	greenThumbPump: { id: 'greenThumbPump', name: 'Green Thumb Pump', text: 'Once/year, take 2 Toadstool at Mushroom Crown as if vacant.' },
}

export const SCARE_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14']

export const SCARES = {
	S1: { id: 'S1', name: 'The Night Fog Is Ground Glass.', text: 'Fever Ward becomes Panicked.', effect: { type: 'panic', venue: 'fever' } },
	S2: { id: 'S2', name: 'The Accountants Are Cheating (Again).', text: 'Lantern & Ledger Panicked.', effect: { type: 'panic', venue: 'lantern' } },
	S3: { id: 'S3', name: 'Golems Have Feelings, It Turns Out.', text: 'Golem Pound Panicked.', effect: { type: 'panic', venue: 'golem' } },
	S4: { id: 'S4', name: 'The Nobles Caught Something Imported.', text: "Nobles' Ring Panicked.", effect: { type: 'panic', venue: 'nobles' } },
	S5: { id: 'S5', name: 'Sieves Everywhere. Just... Sieves.', text: 'Workhouse Panicked.', effect: { type: 'panic', venue: 'workhouse' } },
	S6: { id: 'S6', name: 'The Taxidermist Auctioned Grandma.', text: 'Odditorium Panicked.', effect: { type: 'panic', venue: 'odditorium' } },
	S7: { id: 'S7', name: 'Counterfeit Permits Circulating!', text: 'All venues with Calm customers become Desperate.', effect: { type: 'calmToDesperate' } },
	S8: { id: 'S8', name: 'The Board Is Recalling Toadstools.', text: 'Taking Toadstool at Co-op costs +1 Crown this Year.', effect: { type: 'ingredientSurcharge', kind: 'toad', where: 'coop', amount: 1 } },
	S9: { id: 'S9', name: 'Banshee Shortage.', text: 'All Banshee cost +1 Crown this Year.', effect: { type: 'ingredientSurcharge', kind: 'banshee', where: 'all', amount: 1 } },
	S10: { id: 'S10', name: 'A Real, Genuine Dragon Was Sighted.', text: 'Every venue Panicked; any potion sold to a Panicked venue this Year must pass Reliability.', effect: { type: 'panicAll' } },
	S11: { id: 'S11', name: 'The Inspectors Will Inspect Tomorrow.', text: "Next Audit's Compliance Levies / over-tolerance settlements doubled (clean sales stay free).", effect: { type: 'doubleLevies' } },
	S12: { id: 'S12', name: 'Printing Error: Your Pamphlet Says "Poison."', text: "The leading Hype player's brand takes a Warning.", effect: { type: 'warnHypeLeader' } },
	S13: { id: 'S13', name: 'The Pitch Is Poisoned.', text: 'First Player spends 1 Hype to name a rival whose one planned sale is blocked this High Street (potion not destroyed; may re-offer §8.3). Only Scare costing Hype.', effect: { type: 'pitchPoisoned', hypeCost: 1 } },
	S14: { id: 'S14', name: 'The Great Parchment Blight.', text: 'All craft actions this Year cost one extra ingredient of the same type.', effect: { type: 'craftExtraIngredient' } },
}

export const TESTIMONIAL_IDS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']

export const TESTIMONIALS = {
	T1: { id: 'T1', name: '"It cured MY plague."', text: "+demand magnet on Nobles' Ring: it always pays full Anchor.", effect: { type: 'demandMagnet', venue: 'nobles' } },
	T2: { id: 'T2', name: '"The ledgers never looked healthier."', text: '+demand magnet on Lantern & Ledger: always pays full Anchor.', effect: { type: 'demandMagnet', venue: 'lantern' } },
	T3: { id: 'T3', name: '"My golem can feel again."', text: '+demand magnet on Golem Pound: always pays full Anchor.', effect: { type: 'demandMagnet', venue: 'golem' } },
	T4: { id: 'T4', name: '"Cheaper than the competition\'s scare."', text: '+demand magnet on Workhouse: always pays full Anchor.', effect: { type: 'demandMagnet', venue: 'workhouse' } },
	T5: { id: 'T5', name: '"The fever broke before the bill."', text: '+demand magnet on Fever Ward: always pays full Anchor.', effect: { type: 'demandMagnet', venue: 'fever' } },
	T6: { id: 'T6', name: '"Grandma would\'ve wanted this."', text: '+demand magnet on Odditorium: always pays full Anchor.', effect: { type: 'demandMagnet', venue: 'odditorium' } },
	T7: { id: 'T7', name: '"The Board-certified seal. I trust it."', text: 'One Pricing Exchange tie you enter resolves in your favor.', effect: { type: 'winTieOnce' } },
	T8: { id: 'T8', name: '"It doesn\'t even taste like paperwork."', text: 'Your dumped potions earn 2 Crowns instead of 1.', effect: { type: 'dumpPays', amount: 2 } },
	T9: { id: 'T9', name: '"They fixed the forms too."', text: 'One Warning per Year auto-cancels.', effect: { type: 'cancelWarningYearly' } },
	T10: { id: 'T10', name: '"The Damp Ones swear by it."', text: 'Your potions ignore the "wants" restriction at one venue each use.', effect: { type: 'ignoreWantsOnce' } },
}

export const PAPERWORK = {
	favor: { id: 'favor', name: 'Favor', timing: 'Audit', cost: { crowns: 0, hype: 0, lockHype: 0 }, count: 6, sideDeck: false, text: "Cancel one of your Warnings, OR change the Audit's fee-check order so a chosen other player resolves before you." },
	bribe: { id: 'bribe', name: 'Bribe', timing: 'Morning Post or High Street', cost: { crowns: 2, hype: 0, lockHype: 0 }, count: 6, sideDeck: false, text: "Re-target a Scare onto a chosen rival's venue, OR in a closed Pricing Exchange, treat your Hype bid as +2." },
	sabotage: { id: 'sabotage', name: 'Sabotage Order', timing: 'High Street', cost: { crowns: 0, hype: 2, lockHype: 0 }, count: 6, sideDeck: false, text: "A rival's Kettle: force one potion to spoil now; overrides any protection (Backed Futures / Protect-1). Counters: Fire-Ward (2 Rep), Favor-restitution, Whistling Cork redirect." },
	inspection: { id: 'inspection', name: 'Inspection Notice', timing: 'Any time', cost: { crowns: 1, hype: 0, lockHype: 0 }, count: 6, sideDeck: false, text: 'A chosen rival must settle their outstanding Compliance Levies immediately (as at Audit, Phase D.1) or take a Warning. (No condemnation check.)' },
	expedite: { id: 'expedite', name: 'Expediting Fee', timing: 'Audit', cost: { crowns: 1, hype: 0, lockHype: 0 }, count: 4, sideDeck: true, text: "Skip one of your own fees, OR push a chosen rival's order to resolve last this Phase." },
	backedFutures: { id: 'backedFutures', name: 'Backed Futures', timing: 'Morning Post', cost: { crowns: 0, hype: 0, lockHype: 2 }, count: 4, sideDeck: true, text: 'Designate one potion in your Kettle: it does not spoil for one extra Audit (your Hype returns after it sells or spoils).' },
}

// Not in the prototype: invented per rulebook §7 (target good, threshold 3-5, venue Boone).
export const CHARTER_IDS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']

export const CHARTERS = {
	C1: { id: 'C1', name: 'Golem Boot Allowance', venue: 'golem', target: { type: 'ingredient', kind: 'toad' }, threshold: 4, text: 'Every golem is entitled to two pairs of boots. Contribute 1 Toadstool. The boots are in a different department.' },
	C2: { id: 'C2', name: 'Ledger Standardisation Act', venue: 'lantern', target: { type: 'recipeClass', stars: 1 }, threshold: 3, text: 'Accountants may now rely upon a single, uniform sort of tonic. Contribute 1 one-star potion.' },
	C3: { id: 'C3', name: 'Motion to Pleasantly Pay the Pit-Boss', venue: 'workhouse', target: { type: 'crownPledge', hype: 1 }, threshold: 4, text: 'Pledge 1 Hype. Civic credit only; no physical Crowns change hands.' },
	C4: { id: 'C4', name: 'Fever Ward Ventilation Scheme', venue: 'fever', target: { type: 'recipeClass', stars: 3 }, threshold: 5, text: 'The ward requires air. Contribute 1 three-star potion, which is apparently air-adjacent.' },
	C5: { id: 'C5', name: 'Ministry Oddity Certification', venue: 'odditorium', target: { type: 'ingredient', kind: 'banshee' }, threshold: 3, text: 'Every oddity must be certified by a Banshee. Contribute 1 Banshee, then ask it nicely to leave.' },
	C6: { id: 'C6', name: 'Noble Rooms Fragrance Directive', venue: 'nobles', target: { type: 'crownPledge', hype: 1 }, threshold: 5, text: 'The Ring requires the appearance of generosity without the inconvenience of spending. Pledge 1 Hype.' },
	C7: { id: 'C7', name: 'Ceremonial Elixir for the Ring', venue: 'nobles', target: { type: 'recipeClass', stars: 4 }, threshold: 3, text: 'Only the finest despair is acceptable to the Ring. Contribute 1 four-star potion.' },
	C8: { id: 'C8', name: 'Crystal Donation for the Ward Lamps', venue: 'fever', target: { type: 'ingredient', kind: 'crystal' }, threshold: 4, text: 'The ward lamps run on crystal and good intentions. Contribute 1 Crystal.' },
	C9: { id: 'C9', name: 'Mandatory Two-Star Luncheon', venue: 'lantern', target: { type: 'recipeClass', stars: 2 }, threshold: 4, text: 'Attendance is mandatory and the luncheon is medicinal. Contribute 1 two-star potion.' },
	C10: { id: 'C10', name: 'Voucher Scheme for the Odditorium', venue: 'odditorium', target: { type: 'crownPledge', hype: 1 }, threshold: 3, text: 'Vouchers are redeemable at the Odditorium only, in a different sense. Pledge 1 Hype.' },
}

export const TILES = [
	{ id: 'coop', name: 'Ingredient Co-op', minRank: 'apprentice', tolled: false },
	{ id: 'mushroomCrown', name: 'Mushroom Crown', minRank: 'apprentice', tolled: false },
	{ id: 'crystalQuarry', name: 'Crystal Quarry', minRank: 'apprentice', tolled: false },
	{ id: 'kettle', name: 'The Kettle', minRank: 'journeyman', tolled: false },
	{ id: 'streetAlchemist', name: 'Street Alchemist', minRank: 'journeyman', tolled: true },
	{ id: 'cauldronWorks', name: 'Cauldron Works', minRank: 'apprentice', tolled: true },
]

export const RANKS = ['apprentice', 'journeyman', 'master']

export const HIRE_COST = { apprentice: 1, journeyman: 3, master: 6 }

// Max active roster per Cauldron tier (rulebook §4 Staff).
export const ROSTER_LIMITS = {
	1: { apprentice: 1, journeyman: 1, master: 0, total: 1 },
	2: { apprentice: 2, journeyman: 1, master: 0, total: 3 },
	3: { apprentice: 3, journeyman: 2, master: 1, total: 6 },
	4: { apprentice: 5, journeyman: 3, master: 1, total: 9 },
}

// Cauldron upgrade costs by target tier (rulebook §4 Cauldron upgrades).
export const UPGRADES = {
	2: { rank: 'journeyman', crowns: 6, ingredients: { any: 2 } },
	3: { rank: 'journeyman', crowns: 12, ingredients: { crystal: 1, toad: 1, quick: 1 } },
	4: { rank: 'master', crowns: 20, ingredients: { banshee: 1, any: 2 } },
}

export const KETTLE_CAPACITY = { 1: 3, 2: 4, 3: 5, 4: 6 }

export const APPARATUS_SLOTS = { 1: 0, 2: 0, 3: 1, 4: 2 }

export const TIER_VP = { 1: 0, 2: 3, 3: 7, 4: 11 }

export const START_CASH = 20
export const START_HAND = 3
export const HAND_LIMIT = 4
export const HYPE_CAP = 20
export const REP_MAX = 20
export const YEARS = 7
export const CONTRIBUTION_THRESHOLD = 40
export const UNDERCUT_BONUS = { crowns: 2, rep: 1 }
export const OVER_TOLERANCE = { unlicensed: 2, poison: 3, levy: 2 }
export const FRANCHISE = { cost: 2, gap: 10, premium: 8 }
export const MARKET_SIZE = { 2: 6, 3: 6, 4: 7, 5: 8 }
