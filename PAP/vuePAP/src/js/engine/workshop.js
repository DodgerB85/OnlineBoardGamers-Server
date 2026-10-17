// Morning Shift (rulebook §4): staff assignments to Workshop tiles, crafting, hiring and upgrades.
import * as C from './cards.js'
import { require, log, player, money, newId, kettleCapacity, handLimit, markWorked } from './state.js'

const rankIdx = r => C.RANKS.indexOf(r)
const countRank = (p, rank) => p.staff.filter(x => x.rank === rank).length
const scareEffect = s => (s.yearFx.scare ? C.SCARES[s.yearFx.scare].effect : {})

// where: 'coop' for an Ingredient Co-op take, 'other' for every other ingredient channel.
export function ingredientCost(s, seat, kind, where) {
	const p = player(s, seat)
	const fx = scareEffect(s)
	let cost = kind === 'banshee' && where === 'coop' && !p.apparatus.includes('resonantCopper') ? 1 : 0
	if (fx.type === 'ingredientSurcharge' && fx.kind === kind && (fx.where === 'all' || fx.where === where)) cost += fx.amount
	return cost
}

function take(s, seat, kinds, where) {
	const p = player(s, seat)
	let cost = 0
	for (const k of kinds) {
		require(C.INGREDIENTS.includes(k), 'Unknown ingredient')
		cost += ingredientCost(s, seat, k, where)
		p.ingredients[k] += 1
	}
	money(s, seat, -cost, false)
}

// Mushroom Crown and Crystal Quarry: two of the good, or one of it plus any one ingredient.
function quarry(s, seat, good, c) {
	require(c.mode === 'two' || c.mode === 'mixed', 'Take two of the good, or one of it plus one of your choice')
	take(s, seat, c.mode === 'two' ? [good, good] : [good, c.kind], 'other')
}

function hire(s, seat, staff, rank) {
	const p = player(s, seat)
	const lim = C.ROSTER_LIMITS[p.tier]
	require(C.RANKS.includes(rank) && rankIdx(rank) <= rankIdx(staff.rank), 'You may hire your own rank or lower')
	require(p.staff.length < lim.total && countRank(p, rank) < lim[rank], 'No open roster slot for that rank')
	money(s, seat, -C.HIRE_COST[rank], false)
	p.staff.push({ id: newId(s, 'st'), rank, hiredYear: s.year, tile: null, actedThisYear: false, everWorked: false })
	p.everEmployed += 1
}

// Shared by the Kettle action and the Second Kettle (rulebook §4 Crafting).
export function craftPotion(s, seat, a) {
	const p = player(s, seat)
	const r = C.RECIPES[a.recipe]
	require(r && p.recipes.includes(a.recipe), 'Learn this recipe before crafting it')
	require(p.potions.length < kettleCapacity(p), 'Your Kettle is full')
	const disp = a.disp || null
	require(disp === null || p.dispensations.includes(disp), 'Draft this Dispensation first')
	const poison = a.poison || 0
	require(Number.isInteger(poison) && poison >= 0 && poison <= 3, 'Use 0 to 3 Poison markers')
	const poisonPay = a.poisonPay || []
	require(poisonPay.length === poison && poisonPay.every(k => C.INGREDIENTS.includes(k)), 'Pay one ingredient per Poison marker')

	const need = { ...r.cost }
	// ruling R40: S14 adds one of the first ingredient kind the recipe uses
	if (scareEffect(s).type === 'craftExtraIngredient') need[C.INGREDIENTS.find(k => need[k] > 0)] += 1
	const swap = a.swap || 0
	require(Number.isInteger(swap) && swap >= 0, 'Swap a whole number of units')
	if (swap) require(disp === 'fieldGradeToadstool' || disp === 'shamblingQuicksilver', 'This Dispensation swaps nothing')
	if (disp === 'fieldGradeToadstool') {
		require(swap <= need.toad, 'Too many Toadstool swapped')
		need.toad -= swap
		need.quick += swap
	}
	if (disp === 'shamblingQuicksilver') {
		require(swap <= need.quick, 'Too many Quicksilver swapped')
		need.quick -= swap
		need.crystal += swap
	}
	// ruling R43: the Banshee requirement is replaced in full by two other ingredients
	if (a.swapPay) {
		require(disp === 'doomRecycledBanshee' && need.banshee > 0, 'Only a Banshee requirement can be swapped')
		require(a.swapPay.length === 2 && a.swapPay.every(k => k !== 'banshee' && C.INGREDIENTS.includes(k)), 'Swap for two other ingredients')
		need.banshee = 0
		for (const k of a.swapPay) need[k] += 1
	}
	// ruling R41: Tier 2+ Quicksilver counts double, so a requirement of q is paid with ceil(q/2)
	if (p.tier >= 2) need.quick = Math.ceil(need.quick / 2)
	for (const k of poisonPay) need[k] += 1

	// Only Double-Distilled has a Crown cost; the Loyal Oven takes 1 off any such cost.
	const fee = disp === 'doubleDistilled' ? 1 : 0
	for (const k of C.INGREDIENTS) {
		require(p.ingredients[k] >= need[k], 'Not enough ' + k)
		p.ingredients[k] -= need[k]
	}
	money(s, seat, -Math.max(0, fee - (p.apparatus.includes('loyalOven') ? 1 : 0)), false)

	const potency = r.stars + poison + (disp && C.DISPENSATIONS[disp].family === 'potency' ? 1 : 0)
	p.potions.push({ id: newId(s, 'pt'), recipe: a.recipe, disp, poison, potency, protected: 0, backedFutures: false, reoffered: false, fireWard: false, madeYear: s.year })
	log(s, seat, 'craft', { recipe: a.recipe, disp })
}

function alchemist(s, seat, c) {
	const p = player(s, seat)
	if (c.draft === 'side') {
		require(s.decks.side.length > 0, 'No side-deck Paperwork left')
		p.hand.push(s.decks.side.shift())
		// ruling R45: the discard waits until this seat's shift ends
		if (p.hand.length > handLimit(p)) s.queue.splice(1, 0, { step: 'post.discard', seat, data: {} })
	} else if (c.draft) {
		const deck = { disp: 'dispensations', app: 'apparatus', recipe: 'marketRecipes' }[c.draft]
		const owned = { disp: p.dispensations, app: p.apparatus, recipe: p.recipes }[c.draft]
		require(deck, 'Choose a card type to draft')
		require(s.decks[deck].includes(c.id), 'Not in the market')
		require(!owned.includes(c.id), 'Already owned')
		if (c.draft === 'app') require(C.APPARATUS_SLOTS[p.tier] > p.apparatus.length, 'No free Apparatus slot')
		owned.push(c.id)
		// ruling R46: recipes stay in the market; Dispensations and Apparatus leave it
		if (c.draft !== 'recipe') s.decks[deck].splice(s.decks[deck].indexOf(c.id), 1)
	} else {
		require(Array.isArray(c.take) && c.take.length === 2, 'Take any 2 ingredients')
		take(s, seat, c.take, 'other')
	}
}

function cauldron(s, seat, staff, c) {
	const p = player(s, seat)
	if (c.promote) {
		const target = p.staff.find(x => x.id === c.promote)
		require(target, 'Unknown staff member')
		require(target === staff || target.tile === null, 'Promote yourself or an idle staff member')
		const next = C.RANKS[rankIdx(target.rank) + 1]
		require(next && countRank(p, next) < C.ROSTER_LIMITS[p.tier][next], 'No open roster slot at that rank')
		target.rank = next
	} else if (c.upgrade) {
		require(!p.upgradedThisYear, 'One Cauldron upgrade per Year')
		const tier = p.tier + 1
		const up = C.UPGRADES[tier]
		require(up, 'The Cauldron is already Tier 4')
		require(rankIdx(staff.rank) >= rankIdx(up.rank), 'Upgrading to Tier ' + tier + ' needs a ' + up.rank + ' or higher')
		const pay = c.pay || {}
		let any = 0
		for (const k of Object.keys(pay)) {
			require(C.INGREDIENTS.includes(k) && Number.isInteger(pay[k]) && pay[k] >= 0, 'Unknown ingredient')
			any += pay[k]
		}
		for (const [k, n] of Object.entries(up.ingredients)) {
			if (k === 'any') continue
			require((pay[k] || 0) >= n, 'Upgrade needs ' + n + ' ' + k)
			any -= n
		}
		require(any === (up.ingredients.any || 0), 'Upgrade needs ' + (up.ingredients.any || 0) + ' ingredients of any kind')
		for (const k of Object.keys(pay)) {
			require(p.ingredients[k] >= pay[k], 'Not enough ' + k)
			p.ingredients[k] -= pay[k]
		}
		money(s, seat, -up.crowns, false)
		p.tier = tier
		p.upgradedThisYear = true
	} else {
		require(staff.rank === 'master' && Array.isArray(c.take) && c.take.length === 3, 'Only a Master may take 3 ingredients')
		take(s, seat, c.take, 'other')
	}
}

const TILE_ACTIONS = {
	coop: (s, seat, staff, c) => (c.hire ? hire(s, seat, staff, c.hire) : take(s, seat, [c.kind], 'coop')),
	mushroomCrown: (s, seat, _staff, c) => quarry(s, seat, 'toad', c),
	crystalQuarry: (s, seat, _staff, c) => quarry(s, seat, 'crystal', c),
	kettle: (s, seat, _staff, c) => craftPotion(s, seat, c),
	streetAlchemist: (s, seat, _staff, c) => alchemist(s, seat, c),
	cauldronWorks: (s, seat, staff, c) => cauldron(s, seat, staff, c),
}

export const enter = {
	shift(s) {
		for (const p of s.players) {
			for (const st of p.staff) {
				st.tile = null
				st.actedThisYear = false
			}
			p.upgradedThisYear = false
		}
		for (const seat of s.order) s.queue.push({ step: 'shift', seat, data: {} })
	},
}

export const actions = {
	shift: {
		assign(s, seat, a) {
			const p = player(s, seat)
			const staff = p.staff.find(x => x.id === a.staffId)
			require(staff, 'Unknown staff member')
			require(staff.hiredYear < s.year, 'New hires can act from next Year')
			require(!staff.actedThisYear, 'This staff member already acted this Year')
			const tile = C.TILES.find(t => t.id === a.tile)
			require(tile, 'Unknown Workshop tile')
			require(rankIdx(staff.rank) >= rankIdx(tile.minRank), tile.name + ' needs ' + tile.minRank + ' or higher')
			if (tile.tolled && seat !== s.first) money(s, seat, -1, false)
			TILE_ACTIONS[tile.id](s, seat, staff, a.choice || {})
			staff.tile = tile.id
			staff.actedThisYear = true
			markWorked(p, staff)
			return false
		},
		// ruling R44: once-per-Year flags in usedOnce hold the Year they were spent
		secondKettle(s, seat, a) {
			const p = player(s, seat)
			require(p.apparatus.includes('secondKettle') && p.usedOnce.secondKettle !== s.year, 'The Second Kettle is spent this Year')
			p.usedOnce.secondKettle = s.year
			craftPotion(s, seat, a)
			return false
		},
		fractionator(s, seat, a) {
			const p = player(s, seat)
			require(p.apparatus.includes('fractionator') && p.usedOnce.fractionator !== s.year, 'The Fractionator is spent this Year')
			require(C.INGREDIENTS.includes(a.from) && p.ingredients[a.from] >= 1, 'Choose an ingredient you hold')
			// ruling R42: card text is "2 of a different kind", so both entries name the same kind
			require(Array.isArray(a.to) && a.to.length === 2 && a.to[0] === a.to[1] && C.INGREDIENTS.includes(a.to[0]) && a.to[0] !== a.from, 'Split into 2 of one different kind')
			p.usedOnce.fractionator = s.year
			p.ingredients[a.from] -= 1
			p.ingredients[a.to[0]] += 2
			return false
		},
		greenThumb(s, seat) {
			const p = player(s, seat)
			require(p.apparatus.includes('greenThumbPump') && p.usedOnce.greenThumb !== s.year, 'The Green Thumb Pump is spent this Year')
			p.usedOnce.greenThumb = s.year
			take(s, seat, ['toad', 'toad'], 'other')
			return false
		},
		done() {
			return true
		},
	},
}
