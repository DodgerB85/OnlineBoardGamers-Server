<script setup>
/**
 * Player table, ported from the boardgamefiesta GWT player-board.component
 * (GPL-3.0, Tom Wetjens): player_board_{color}.jpg backdrop, positioned worker
 * tiles, temporary-certificate markers, auxiliary-action squares and unlock
 * discs with the same coordinates as the original SVG.
 */
import { computed, ref } from "vue"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as map from "../js/ROWmap"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"
import CardView from "./CardView.vue"

const props = defineProps({ playerName: { type: String, default: "" } })

const { ActionType, Unlockable } = rf
const store = useModelStore()
const personal = usePersonalStore()

const game = computed(() => {
	store.version
	return store.game
})

// Only the viewer's own board shows their hand; opponents and spectators see
// the public board (hand shown as card backs). In a practice (hotseat) game the
// viewer plays every seat, so every hand is shown.
const readonly = computed(() => {
	const g = game.value
	if (!g) return true
	if (personal.trainingGame) return false
	if (!personal.name) return true
	return props.playerName !== personal.name
})

// Only this board can be acted on: the viewer's own seat, or (hotseat) the
// current player's seat.
const interactive = computed(() => {
	const g = game.value
	if (!g) return false
	if (personal.trainingGame) return props.playerName === g.currentPlayer
	return !!personal.name && props.playerName === personal.name
})
const ps = computed(() => {
	const g = game.value
	if (!g) return null
	try {
		return props.playerName ? g.playerState(props.playerName) : g.currentPlayerState()
	} catch {
		return null
	}
})
const color = computed(() => {
	const g = game.value
	return g && ps.value ? g.state.players.find((p) => p.name === ps.value.player)?.color?.toLowerCase() ?? "red" : "red"
})
const playerCount = computed(() => game.value?.state.players.length ?? 2)

const edition = computed(() => game.value?.edition ?? "FIRST")
const SECOND = computed(() => edition.value === "SECOND")

// Worker tiles: the reference draws count-1 tiles (the last one is the "free" worker).
const cowboys = computed(() => Math.max(0, (ps.value?.getNumberOfCowboys() ?? 0) - 1))
const craftsmen = computed(() => Math.max(0, (ps.value?.getNumberOfCraftsmen() ?? 0) - 1))
const engineers = computed(() => Math.max(0, (ps.value?.getNumberOfEngineers() ?? 0) - 1))

const tempCertificates = computed(() => ps.value?.tempCertificates ?? 0)

const certMarkers = [
	{ n: 0, y: 158 },
	{ n: 1, y: 198 },
	{ n: 2, y: 239 },
	{ n: 3, y: 280 },
	{ n: 4, y: 328 },
	{ n: 6, y: 389 },
]

// A disc is clickable (yellow) when an unlock action is live and this disc can
// still be removed. Clicking performs the unlock directly.
function discUnlockAction(d) {
	if (!interactive.value || !ps.value) return null
	// Only the next disc in the pair can be removed: left first, then right.
	if ((ps.value.unlocked[d.u] ?? 0) !== d.nth - 1) return null
	if (!ps.value.canUnlock(d.u, game.value.isRailsToTheNorth())) return null
	if (!d.black && store.actions.includes(ActionType.UNLOCK_WHITE)) return ActionType.UNLOCK_WHITE
	if (store.actions.includes(ActionType.UNLOCK_BLACK_OR_WHITE)) return ActionType.UNLOCK_BLACK_OR_WHITE
	return null
}

function unlocked(u, atLeast = 1) {
	return (ps.value?.unlocked[u] ?? 0) >= atLeast
}

const auxRemoveCardAction = computed(() => (SECOND.value ? ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR : ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD))
const auxRemoveCard2Action = computed(() => (SECOND.value ? ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS : ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS))

const AUX_ROW_DEFS = [
	{ id: "aux-dollar", y: 41, single: ActionType.GAIN_1_DOLLAR, double: ActionType.GAIN_2_DOLLARS },
	{ id: "aux-draw", y: 120, single: ActionType.DRAW_CARD, double: ActionType.DRAW_2_CARDS },
	{ id: "aux-move-engine-backwards", y: 204, single: ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE, double: ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES },
	{ id: "aux-move-engine-forward", y: 288, single: ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD, double: ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD },
]

const auxRows = computed(() => [...AUX_ROW_DEFS, {
	id: "aux-remove-card",
	y: 368,
	single: auxRemoveCardAction.value,
	double: auxRemoveCard2Action.value,
}].map((row) => ({
	...row,
	action: store.actions.includes(row.double) ? row.double : row.single,
})))

function activateAuxiliaryAction(action) {
	if (!interactive.value || !store.actions.includes(action)) return
	if (map.engineMoveRange(action, game.value)) {
		store.selectAction(action)
		return
	}
	controller.perform({ type: action })
}

// Unlock discs: [unlockable, cx, cy, color] (white = first disc of a pair).
const DISCS = [
	{ u: Unlockable.AUX_GAIN_DOLLAR, cx: 138, cy: 67, black: false, nth: 2 },
	{ u: Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD, cx: 140, cy: 146, black: false, nth: 2 },
	{ u: Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT, cx: 42, cy: 230, black: false, nth: 1 },
	{ u: Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT, cx: 142, cy: 230, black: false, nth: 2 },
	{ u: Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD, cx: 42, cy: 314, black: false, nth: 1 },
	{ u: Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD, cx: 142, cy: 314, black: false, nth: 2 },
	{ u: Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD, cx: 42, cy: 394, black: false, nth: 1 },
	{ u: Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD, cx: 142, cy: 396, black: false, nth: 2 },
	{ u: Unlockable.EXTRA_STEP_DOLLARS, cx: 282, cy: 70, black: true, nth: 1 },
	{ u: Unlockable.EXTRA_STEP_POINTS, cx: 342, cy: 70, black: true, nth: 1 },
	{ u: Unlockable.EXTRA_CARD, cx: 674, cy: 72, black: true, nth: 1 },
	{ u: Unlockable.EXTRA_CARD, cx: 758, cy: 72, black: true, nth: 2 },
	{ u: Unlockable.CERT_LIMIT_4, cx: 761, cy: 346, black: false, nth: 1 },
	{ u: Unlockable.CERT_LIMIT_6, cx: 761, cy: 404, black: true, nth: 1 },
]

function workerEligible(index, kind) {
	if (!interactive.value || store.selectedAction !== ActionType.APPOINT_STATION_MASTER || !ps.value) return false
	const total = kind === "cowboy" ? ps.value.getNumberOfCowboys() : kind === "craftsman" ? ps.value.getNumberOfCraftsmen() : ps.value.getNumberOfEngineers()
	return index === total - 2
}

function onWorker(kind) {
	if (interactive.value && store.selectedAction === ActionType.APPOINT_STATION_MASTER) {
		controller.perform({ type: ActionType.APPOINT_STATION_MASTER, worker: kind === "cowboy" ? "COWBOY" : kind === "craftsman" ? "CRAFTSMAN" : "ENGINEER" })
	}
}

function unlock(d) {
	const type = discUnlockAction(d)
	if (!type) return
	controller.perform({ type, unlock: d.u })
}

const hand = computed(() => ps.value?.hand ?? [])

// Personal collections + card stacks (public info; shown on every board).
const drawStackSize = computed(() => ps.value?.drawStack.length ?? 0)
const discardSize = computed(() => ps.value?.discardPile.length ?? 0)
const showStack = ref(null) // "draw" | "discard"
/** Display copy only: sorted by value so the pile's real order can never leak. */
function displayOrder(a, b) {
	return (a.value ?? 0) - (b.value ?? 0) || String(a.type).localeCompare(String(b.type)) || (a.points ?? 0) - (b.points ?? 0)
}
const viewedCards = computed(() => {
	const p = ps.value
	if (!p) return []
	if (showStack.value === "draw") return [...p.drawStack].sort(displayOrder)
	if (showStack.value === "discard") return [...p.discardPile]
	return []
})
function toggleStack(which) {
	showStack.value = showStack.value === which ? null : which
}
const collections = computed(() => {
	const p = ps.value
	return {
		masters: (p?.stationMasters ?? []).map((m) => ({ name: m, img: view.stationMasterImage(m) })),
		hazards: (p?.hazards ?? []).map((h) => ({ img: view.hazardImage(h.type, h.hand), label: `${h.type} (${h.hand}) ${h.points} pts` })),
		teepees: (p?.teepees ?? []).map((t) => ({ img: view.teepeeImage(t), label: `${t} teepee` })),
		token: p?.jobMarketToken ?? false,
	}
})

// ---- hand selection (reference canSelectCard / selectCard) ----
function canSelectCard(card) {
	if (!interactive.value) return false
	const sel = store.selectedAction
	if (!sel) return false
	const cattle = isCattle(card)
	switch (sel) {
		case ActionType.DISCARD_CARD:
		case ActionType.REMOVE_CARD:
		case ActionType.UPGRADE_SIMMENTAL:
			return true
		case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
		case ActionType.PLAY_OBJECTIVE_CARD:
			return isObjective(card)
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE:
		case ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS:
			return cattle
		case ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS:
		case ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS:
			return cattle && hand.value.filter(isCattle).filter((c) => c.type === card.type).length > 1
		default:
			return false
	}
}

function isCattle(card) {
	return card && card.value !== undefined
}
function isObjective(card) {
	return card && card.tasks !== undefined
}

function selectCard(card) {
	if (!canSelectCard(card)) return
	const sel = store.selectedAction
	switch (sel) {
		case ActionType.DISCARD_CARD:
		case ActionType.REMOVE_CARD:
		case ActionType.UPGRADE_SIMMENTAL:
			// These engine actions take the whole card object.
			controller.perform({ type: sel, card })
			return
		case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
		case ActionType.PLAY_OBJECTIVE_CARD:
			controller.perform({ type: sel, objectiveCard: card })
			return
		default:
			controller.perform({ type: sel, cattleType: card.type })
	}
}
</script>

<template>
	<div v-if="ps" id="playerBoard" :style="{ borderColor: color }">
		<div class="header">
			<span class="balance">${{ ps.balance }}</span>
			<span v-if="ps.handValue()">hand value {{ ps.handValue() }}</span>
			<span>certs {{ ps.tempCertificates }}/{{ ps.tempCertificates + ps.permanentCertificates() }}</span>
			<span>engine {{ store.game?.getRailroadTrack().currentSpace(ps.player) }}</span>
		</div>
		<div class="collections">
			<span class="stack" :title="`Draw pile (${drawStackSize}) — click to inspect`" @click="toggleStack('draw')">
				<img :src="view.cardBackGreyImage()" alt="" /><b>{{ drawStackSize }}</b><em class="stackLabel">Draw</em>
			</span>
			<span class="stack discard" :title="`Discard pile (${discardSize}) — click to inspect`" @click="toggleStack('discard')">
				<img :src="view.cardBackGreyImage()" alt="" /><b>{{ discardSize }}</b><em class="stackLabel">Discard</em>
			</span>
			<img v-for="m in collections.masters" :key="'sm' + m.name" class="collect" :src="m.img" :title="view.humanizeAction(m.name)" alt="" />
			<img v-for="(h, i) in collections.hazards" :key="'hz' + i" class="collect" :src="h.img" :title="h.label" alt="" />
			<img v-for="(t, i) in collections.teepees" :key="'tp' + i" class="collect" :src="t.img" :title="t.label" alt="" />
			<img v-if="collections.token" class="collect" :src="view.jobMarketTokenImage()" title="Job market token" alt="" />
		</div>
		<div class="hand">
			<template v-if="!readonly">
				<CardView
					v-for="(card, i) in hand"
					:key="i"
					class="handCard"
					:class="{ selectable: canSelectCard(card), dimmed: !!store.selectedAction && !canSelectCard(card) }"
					:card="card"
					@click="selectCard(card)"
				/>
			</template>
			<template v-else>
				<div v-for="i in hand.length" :key="i" class="handCard back">
					<img :src="view.cardBackGreyImage()" alt="" draggable="false" />
				</div>
			</template>
		</div>

		<svg class="player-board" :class="color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 442">
			<image :href="view.editionImage(edition, `player_board_${color}.jpg`)" x="0" y="0" width="800" height="446" />
			<image v-if="playerCount > 2" :href="`/static/ROW/images/row/${playerCount}p_${color}.jpg`" x="179" y="-9" width="268" height="150" />

			<!-- workers (count-1 like the original; the last one is on deck) -->
			<g v-for="i in cowboys" :key="'c' + i" transform="scale(2.2,2.2)">
				<image :href="view.workerImage('COWBOY')" :x="122 + (i - 1) * 36.7" y="71" width="33" height="39" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="71" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'cowboy') }" @click="onWorker('cowboy')" />
			</g>
			<g v-for="i in craftsmen" :key="'k' + i" transform="scale(2.2,2.2)">
				<image :href="view.workerImage('CRAFTSMAN')" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'craftsman') }" @click="onWorker('craftsman')" />
			</g>
			<g v-for="i in engineers" :key="'e' + i" transform="scale(2.2,2.2)">
				<image :href="view.workerImage('ENGINEER')" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'engineer') }" @click="onWorker('engineer')" />
			</g>

			<!-- temporary certificates -->
			<rect v-for="m in certMarkers" v-show="tempCertificates === m.n" :key="'cert' + m.n" class="marker" x="744" :y="m.y" width="30" height="30" />

			<!-- Choose one auxiliary row. If its double action is available, select that by default. -->
			<rect
				v-for="row in auxRows"
				:key="row.id"
				class="action"
				x="13"
				:y="row.y"
				rx="4"
				ry="4"
				width="155"
				height="54"
				:class="{ selectable: interactive && store.actions.includes(row.action), disabled: !interactive || !store.actions.includes(row.action) }"
				@click="activateAuxiliaryAction(row.action)"
			>
				<title>{{ view.humanizeAction(row.action) }}</title>
			</rect>

			<!-- unlock discs -->
			<circle
				v-for="(d, i) in DISCS"
				:key="'d' + i"
				class="disc"
				:class="[`${d.u}_todo_${d.nth}`, unlocked(d.u, d.nth) ? 'unlocked' : '', discUnlockAction(d) ? 'selectable' : 'disabled']"
				:cx="d.cx"
				:cy="d.cy"
				r="25"
				@click="unlock(d)"
			>
				<title>{{ d.u }}</title>
			</circle>

			<!-- cowboys remaining, when a cowboy-spending action is active -->
			<g v-if="store.actions.includes(ActionType.DRAW_2_CATTLE_CARDS) || store.actions.includes(ActionType.BUY_CATTLE)">
				<text x="222" y="224" text-anchor="middle" class="cowboysRemaining">{{ ps.cowboysRemaining() }}/{{ ps.getNumberOfCowboys() }}</text>
			</g>
		</svg>
		<div v-if="showStack" class="stackDialog">
			<div class="stackDialogHead">
				{{ showStack === "draw" ? "Draw pile (shown in value order)" : "Discard pile" }} ({{ showStack === "draw" ? drawStackSize : discardSize }})
				<button @click="showStack = null">Close</button>
			</div>
			<div class="stackDialogCards">
				<CardView v-for="(c, i) in viewedCards" :key="i" :card="c" />
				<span v-if="viewedCards.length === 0" class="empty">Empty</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
#playerBoard { display: block; width: 100%; margin: 8px 0; box-sizing: border-box; border: 4px solid; border-radius: 8px; padding: 4px; }
.header { margin-bottom: 4px; font-size: 13px; display: flex; gap: 14px; justify-content: center; }
.header .balance { font-weight: bold; color: #0a6c0a; }
.collections { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px; margin-bottom: 4px; min-height: 64px; }
.collections .collect { width: 26px; height: 30px; border: 1px solid #fff; border-radius: 4px; background: #fff; }
.collections .stack { position: relative; box-sizing: border-box; width: 52px; height: 60px; border: 3px solid #ffd400; border-radius: 4px; overflow: hidden; cursor: pointer; }
.collections .stack:hover { border-color: #90ee90; }
.collections .stack img { width: 100%; height: 100%; display: block; }
.collections .stack.discard img { filter: grayscale(0.6); }
.collections .stack b { position: absolute; right: 1px; bottom: 0; color: #fff; font-size: 13px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
.collections .stack .stackLabel {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	font-style: normal;
	font-size: 13px;
	font-weight: bold;
	line-height: 17px;
	text-align: center;
	color: #fff;
	background: rgba(0, 0, 0, 0.55);
	text-shadow: -1px -1px 0 #000, 1px 1px 0 #000;
}
.hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 6px; min-height: 58px; }
.handCard { cursor: default; }
.handCard.back { width: 80px; height: 115px; border: 1px solid #ffffff; border-radius: 5px; overflow: hidden; flex: none; }
.handCard.back img { width: 100%; height: 100%; display: block; }
.handCard.selectable { cursor: pointer; outline: 2px solid #d4af37; }
.handCard.dimmed { opacity: 0.45; }

.stackDialog { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 90; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.stackDialogHead { color: #fff; font-weight: bold; margin-bottom: 8px; }
.stackDialogHead button { margin-left: 10px; cursor: pointer; }
.stackDialogCards { display: flex; flex-wrap: wrap; gap: 4px; max-width: 70vw; max-height: 60vh; overflow-y: auto; background: #fffde8; padding: 8px; border-radius: 6px; }
.stackDialogCards .empty { color: #666; padding: 8px; }

.player-board {
	width: 100%;
	height: auto;
	display: block;
	background-color: #7b706f;
	box-shadow: 4px 4px 4px rgb(0, 0, 0, 0.75);
}

.action,
.marker {
	stroke-opacity: 1;
	stroke: #ffffff;
	stroke-width: 2;
	fill: rgb(0, 0, 0, 0.01);
}
.action.selectable { cursor: pointer; stroke: #ffd400; stroke-width: 4; }
.action.selectable:hover { stroke: #90ee90; stroke-width: 6; }
.action.disabled { stroke: none; }

.disc {
	fill: #b58b6f; /* replaced by color per disc variant below */
	stroke-width: 3;
	cursor: default;
}
.disc.unlocked { display: none; }
.disc.selectable { cursor: pointer; stroke: #ffd400; stroke-width: 4; }
.disc.selectable:hover { stroke: #90ee90; stroke-width: 6; }
.disc.disabled { stroke: none; }

/* Disc colors: white discs start brownish on the artwork; black discs black. */
.disc.AUX_GAIN_DOLLAR_todo_2, .disc.AUX_DRAW_CARD_TO_DISCARD_CARD_todo_2,
.disc.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT_todo_1, .disc.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT_todo_2,
.disc.AUX_PAY_TO_MOVE_ENGINE_FORWARD_todo_1, .disc.AUX_PAY_TO_MOVE_ENGINE_FORWARD_todo_2,
.disc.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD_todo_1, .disc.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD_todo_2,
.disc.CERT_LIMIT_4_todo_1 { fill: #d9d9d9; }
.disc.EXTRA_STEP_DOLLARS_todo_1, .disc.EXTRA_STEP_POINTS_todo_1,
.disc.EXTRA_CARD_todo_1, .disc.EXTRA_CARD_todo_2, .disc.CERT_LIMIT_6_todo_1 { fill: black; }

.worker { fill: transparent; cursor: default; }
.worker.selectable { cursor: pointer; stroke: #ffd400; stroke-width: 2; }
.worker.selectable:hover { stroke: #90ee90; stroke-width: 3; }

.cowboysRemaining {
	font-size: 32px;
	font-weight: bold;
	fill: white;
	stroke: black;
	stroke-width: 1;
}
</style>
