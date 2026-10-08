<script setup lang="ts">
/**
 * Player board, ported from the boardgamefiesta GWT player-board.component
 * (GPL-3.0, Tom Wetjens): player_board_{color}.jpg backdrop, positioned worker
 * tiles, temporary-certificate markers, auxiliary-action squares and unlock
 * discs with the same coordinates as the original SVG.
 */
import { computed } from "vue"
import { ActionType, Unlockable, isCattleCard } from "../game"
import { useGameStore } from "../stores/game"
import { cardBackGreyImage, editionImage, workerImage } from "../view/assets"
import CardView from "./CardView.vue"

const props = withDefaults(defineProps<{ playerName?: string }>(), { playerName: "" })

const store = useGameStore()

const game = computed(() => {
	store.version
	return store.game
})

// Readonly boards show other players; default is the acting player's own board.
const readonly = computed(() => {
	const g = game.value
	return !!props.playerName && !!g && props.playerName !== g.currentPlayer
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
	return g && ps.value ? g.state.players.find((p) => p.name === ps.value!.player)?.color?.toLowerCase() ?? "red" : "red"
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

const canUnlockWhite = computed(() => store.selectedAction === ActionType.UNLOCK_WHITE || store.selectedAction === ActionType.UNLOCK_BLACK_OR_WHITE)
const canUnlockBlack = computed(() => store.selectedAction === ActionType.UNLOCK_BLACK_OR_WHITE)

function unlocked(u: Unlockable, atLeast = 1): boolean {
	return (ps.value?.unlocked[u] ?? 0) >= atLeast
}

const unlockedCount = computed<Record<Unlockable, number>>(() => {
	const psRef = ps.value
	return Object.fromEntries(
		Object.values(Unlockable).map((u) => [u, psRef?.unlocked[u] ?? 0]),
	) as Record<Unlockable, number>
})

const AUX_ACTIONS: { id: string; x: number; y: number; action: ActionType }[] = [
	{ id: "aux-dollar", x: 13, y: 41, action: ActionType.GAIN_1_DOLLAR },
	{ id: "aux-dollar-2", x: 111, y: 41, action: ActionType.GAIN_2_DOLLARS },
	{ id: "aux-draw", x: 13, y: 120, action: ActionType.DRAW_CARD },
	{ id: "aux-draw-2", x: 112, y: 120, action: ActionType.DRAW_2_CARDS },
	{ id: "aux-move-engine-backwards", x: 13, y: 204, action: ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE },
	{ id: "aux-move-engine-backwards-2", x: 114, y: 204, action: ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES },
	{ id: "aux-move-engine-forward", x: 13, y: 288, action: ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD },
	{ id: "aux-move-engine-forward-2", x: 114, y: 288, action: ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD },
]

const auxRemoveCardAction = computed(() => (SECOND.value ? ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR : ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD))
const auxRemoveCard2Action = computed(() => (SECOND.value ? ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS : ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS))

// Unlock discs: [unlockable, cx, cy, color] (white = first disc of a pair).
interface Disc { u: Unlockable; cx: number; cy: number; black: boolean; nth: number }
const DISCS: Disc[] = [
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

function workerEligible(index: number, kind: "cowboy" | "craftsman" | "engineer"): boolean {
	if (store.selectedAction !== ActionType.APPOINT_STATION_MASTER || !ps.value) return false
	const total = kind === "cowboy" ? ps.value.getNumberOfCowboys() : kind === "craftsman" ? ps.value.getNumberOfCraftsmen() : ps.value.getNumberOfEngineers()
	return index === total - 2
}

function onWorker(kind: "cowboy" | "craftsman" | "engineer") {
	if (!readonly.value && store.selectedAction === ActionType.APPOINT_STATION_MASTER) {
		store.perform({ type: ActionType.APPOINT_STATION_MASTER, worker: kind === "cowboy" ? "COWBOY" : kind === "craftsman" ? "CRAFTSMAN" : "ENGINEER" })
	}
}

function unlock(d: Disc) {
	if (readonly.value) return
	if (!canUnlockWhite.value) return
	if (d.black && !canUnlockBlack.value) return
	store.perform({ type: store.selectedAction as ActionType, unlock: d.u })
}

function clickAux(action: ActionType) {
	if (readonly.value) return
	if (store.actions.includes(action)) store.perform({ type: action })
}

const hand = computed(() => ps.value?.hand ?? [])

// ---- hand selection (reference canSelectCard / selectCard) ----
function canSelectCard(card: unknown): boolean {
	if (readonly.value) return false
	const sel = store.selectedAction
	if (!sel) return false
	const cattle = isCattleCard(card as never)
	switch (sel) {
		case ActionType.DISCARD_CARD:
		case ActionType.REMOVE_CARD:
			return true
		case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
		case ActionType.PLAY_OBJECTIVE_CARD:
			return !cattle
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
		case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE:
		case ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS:
			return cattle
		case ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS:
		case ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS:
			return cattle && hand.value.filter(isCattleCard).filter((c) => (c as { type: string }).type === (card as { type: string }).type).length > 1
		default:
			return false
	}
}

function selectCard(card: unknown) {
	if (!canSelectCard(card)) return
	const sel = store.selectedAction as ActionType
	const cattle = isCattleCard(card as never)
	if (cattle) {
		const c = card as { type: string }
		store.perform({ type: sel, cattleType: c.type })
	} else {
		store.perform({ type: sel, objectiveCard: card })
	}
}
</script>

<template>
	<div v-if="ps" id="playerBoard">
		<div class="header">
			<span class="balance">${{ ps.balance }}</span>
			<span v-if="ps.handValue()">hand value {{ ps.handValue() }}</span>
			<span>certs {{ ps.tempCertificates }}/{{ ps.tempCertificates + ps.permanentCertificates() }}</span>
			<span>engine {{ store.game?.getRailroadTrack().currentSpace(ps.player) }}</span>
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
					<img :src="cardBackGreyImage()" alt="" draggable="false" />
				</div>
			</template>
		</div>

		<svg class="player-board" :class="color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 442">
			<defs>
				<clipPath id="tileclipPB">
					<rect rx="6" ry="6" width="33" height="39" />
				</clipPath>
			</defs>
			<image :href="editionImage(edition, `player_board_${color}.jpg`)" x="0" y="0" width="800" height="446" />
			<image v-if="playerCount > 2" :href="`/static/ROW/images/row/${playerCount}p_${color}.jpg`" x="179" y="-9" width="268" height="150" />

			<!-- workers (count-1 like the original; the last one is on deck) -->
			<g v-for="i in cowboys" :key="'c' + i" transform="scale(2.2,2.2)">
				<image :href="workerImage('COWBOY')" :x="122 + (i - 1) * 36.7" y="71" width="33" height="39" clip-path="url(#tileclipPB)" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="71" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'cowboy') }" @click="onWorker('cowboy')" />
			</g>
			<g v-for="i in craftsmen" :key="'k' + i" transform="scale(2.2,2.2)">
				<image :href="workerImage('CRAFTSMAN')" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" clip-path="url(#tileclipPB)" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'craftsman') }" @click="onWorker('craftsman')" />
			</g>
			<g v-for="i in engineers" :key="'e' + i" transform="scale(2.2,2.2)">
				<image :href="workerImage('ENGINEER')" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" clip-path="url(#tileclipPB)" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'engineer') }" @click="onWorker('engineer')" />
			</g>

			<!-- temporary certificates -->
			<rect v-for="m in certMarkers" v-show="tempCertificates === m.n" :key="'cert' + m.n" class="marker" x="744" :y="m.y" width="30" height="30" />

			<!-- auxiliary actions -->
			<rect
				v-for="a in AUX_ACTIONS"
				:key="a.id"
				class="action"
				:x="a.x"
				:y="a.y"
				rx="4"
				ry="4"
				width="54"
				height="54"
				:class="{ selectable: store.actions.includes(a.action), disabled: !store.actions.includes(a.action) }"
				@click="store.actions.includes(a.action) && store.perform({ type: a.action })"
			>
				<title>{{ a.action }}</title>
			</rect>
			<rect class="action" x="13" y="368" rx="4" ry="4" width="54" height="54" :class="{ selectable: store.actions.includes(auxRemoveCardAction), disabled: !store.actions.includes(auxRemoveCardAction) }" @click="store.actions.includes(auxRemoveCardAction) && store.perform({ type: auxRemoveCardAction })" />
			<rect class="action" x="114" y="368" rx="4" ry="4" width="54" height="54" :class="{ selectable: store.actions.includes(auxRemoveCard2Action), disabled: !store.actions.includes(auxRemoveCard2Action) }" @click="store.actions.includes(auxRemoveCard2Action) && store.perform({ type: auxRemoveCard2Action })" />

			<!-- unlock discs -->
			<circle
				v-for="(d, i) in DISCS"
				:key="'d' + i"
				class="disc"
				:class="[`${d.u}_todo_${d.nth}`, unlocked(d.u, d.nth) ? 'unlocked' : '', d.black ? (canUnlockBlack ? 'selectable' : 'disabled') : canUnlockWhite ? 'selectable' : 'disabled']"
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
	</div>
</template>

<style scoped>
#playerBoard { display: block; width: 100%; margin: 8px 0; }
.header { margin-bottom: 4px; font-size: 13px; display: flex; gap: 14px; justify-content: center; }
.header .balance { font-weight: bold; color: #0a6c0a; }
.hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 6px; min-height: 58px; }
.handCard { cursor: default; }
.handCard.back { width: 80px; height: 115px; border: 1px solid #ffffff; border-radius: 5px; overflow: hidden; flex: none; }
.handCard.back img { width: 100%; height: 100%; display: block; }
.handCard.selectable { cursor: pointer; outline: 2px solid #d4af37; }
.handCard.dimmed { opacity: 0.45; }

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
.action.selectable { cursor: pointer; }
.action.selectable:hover { stroke: black; }
.action.disabled { stroke: none; }

.disc {
	fill: #b58b6f; /* replaced by color per disc variant below */
	stroke-width: 3;
	cursor: default;
}
.disc.unlocked { display: none; }
.disc.selectable { cursor: pointer; }
.disc.selectable:hover { stroke: black; }
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
.worker.selectable { cursor: pointer; animation: pulse 1s infinite alternate; }
@keyframes pulse {
	from { fill: rgb(0, 0, 0, 0.05); }
	to { fill: rgb(255, 255, 255, 0.35); }
}

.cowboysRemaining {
	font-size: 32px;
	font-weight: bold;
	fill: white;
	stroke: black;
	stroke-width: 1;
}
</style>
