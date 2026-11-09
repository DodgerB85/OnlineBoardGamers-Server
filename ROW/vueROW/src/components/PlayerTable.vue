<script setup>
/**
 * Player table, ported from the boardgamefiesta GWT player-board.component
 * (GPL-3.0, Tom Wetjens): player_board_{color}.jpg backdrop, positioned worker
 * tiles, temporary-certificate markers, auxiliary-action squares and unlock
 * discs with the same coordinates as the original SVG.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import * as rf from "../js/ROWreference"
import * as controller from "../js/ROWcontroller"
import * as map from "../js/ROWmap"
import * as view from "../js/ROWview"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"
import CardView from "./CardView.vue"

const props = defineProps({ playerName: { type: String, default: "" } })

const { ActionType, Unlockable } = rf
const { t } = useI18n()
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
const actable = computed(() => interactive.value && controller.canAct())
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
	if (!actable.value || !ps.value) return null
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

const auxWrapper = computed(() => {
	if (!actable.value) return null
	return [ActionType.SINGLE_AUXILIARY_ACTION, ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION].find((a) => store.actions.includes(a)) ?? null
})

/** Actions the live single/double auxiliary wrapper still offers. */
function auxOfferedActions() {
	const g = game.value
	const p = ps.value
	if (!g || !p || !auxWrapper.value) return new Set()
	const list = auxWrapper.value === ActionType.SINGLE_AUXILIARY_ACTION ? g.unlockedSingleAuxiliaryActions(p) : g.unlockedSingleOrDoubleAuxiliaryActions(p)
	const out = new Set()
	for (const possible of list) for (const action of possible.getPossibleActions()) out.add(action)
	return out
}

function auxRowAvailable(row) {
	if (!actable.value) return false
	if (store.actions.includes(row.double) || store.actions.includes(row.single)) return true
	if (!auxWrapper.value) return false
	const offered = auxOfferedActions()
	return offered.has(row.double) || offered.has(row.single)
}

function runAuxiliaryAction(action) {
	if (map.engineMoveRange(action, game.value)) {
		store.selectAction(action)
		return
	}
	controller.perform({ type: action })
}

function activateAuxiliaryAction(row) {
	if (!actable.value) return
	const direct = store.actions.includes(row.double) ? row.double : store.actions.includes(row.single) ? row.single : null
	if (direct) {
		runAuxiliaryAction(direct)
		return
	}
	if (!auxWrapper.value) return
	// The wrapper only opens the choice; picking the row's best action is the player's click.
	if (!controller.perform({ type: auxWrapper.value })) return
	const after = store.actions.includes(row.double) ? row.double : store.actions.includes(row.single) ? row.single : null
	if (after) runAuxiliaryAction(after)
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
	if (!actable.value || !store.actions.includes(ActionType.APPOINT_STATION_MASTER) || !ps.value) return false
	const total = kind === "cowboy" ? ps.value.getNumberOfCowboys() : kind === "craftsman" ? ps.value.getNumberOfCraftsmen() : ps.value.getNumberOfEngineers()
	return index === total - 2
}

function onWorker(kind) {
	if (actable.value && store.actions.includes(ActionType.APPOINT_STATION_MASTER)) {
		controller.perform({ type: ActionType.APPOINT_STATION_MASTER, worker: kind === "cowboy" ? "COWBOY" : kind === "craftsman" ? "CRAFTSMAN" : "ENGINEER" })
	}
}

function unlock(d) {
	const type = discUnlockAction(d)
	if (!type) return
	controller.perform({ type, unlock: d.u })
}

const hand = computed(() => ps.value?.hand ?? [])

// ---- hand selection (reference canSelectCard / selectCard) ----
const hoveredCard = ref(null)
const menu = ref(null)

const PAIR_ACTIONS = new Set([ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS, ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS])

function applicableCardActions(card) {
	if (!actable.value || !card) return []
	const actions = map.cardActionsFor(card, hand.value, store.actions)
	// A building hotspot may have armed one specific action: keep the table focused on it.
	if (store.selectedAction) return actions.filter((a) => a === store.selectedAction)
	if (actions.length || !auxWrapper.value) return actions
	// A single/double auxiliary action can also offer card actions (e.g. the RttN
	// branchlet); they only become live after the wrapper is performed.
	return map.cardActionsFor(card, hand.value, [...auxOfferedActions()])
}

function canSelectCard(card) {
	return applicableCardActions(card).length > 0
}

/** The two cards a hovered card's pair action would discard (the engine takes the lowest values). */
const pairToDiscard = computed(() => {
	const i = hoveredCard.value
	const card = i === null ? null : hand.value[i]
	if (!card) return new Set()
	const pair = applicableCardActions(card).find((a) => PAIR_ACTIONS.has(a))
	if (!pair) return new Set()
	const same = hand.value
		.map((c, k) => ({ c, k }))
		.filter(({ c }) => isCattle(c) && c.type === card.type)
		.sort((a, b) => a.c.value - b.c.value)
	if (same.length < 2) return new Set()
	return new Set(same.slice(0, 2).map(({ k }) => k))
})

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
		hazards: (p?.hazards ?? []).map((h) => ({ img: view.hazardImage(h.type, h.hand), label: t("row.playerTable.hazardTitle", { type: h.type, hand: h.hand, points: h.points }) })),
		teepees: (p?.teepees ?? []).map((tp) => ({ img: view.teepeeImage(tp), label: t("row.playerTable.teepeeTitle", { teepee: tp }) })),
		token: p?.jobMarketToken ?? false,
		exchangeTokens: p?.exchangeTokens ?? 0,
	}
})

// These effects have no board target, so the player-board counters are the click surface.
const DOLLAR_GAINS = new Set([
	ActionType.GAIN_1_DOLLAR,
	ActionType.GAIN_2_DOLLARS,
	ActionType.GAIN_3_DOLLARS,
	ActionType.GAIN_4_DOLLARS,
	ActionType.GAIN_5_DOLLARS,
	ActionType.GAIN_12_DOLLARS,
	ActionType.GAIN_1_DOLLAR_PER_ENGINEER,
	ActionType.GAIN_1_DOLLAR_PER_CRAFTSMAN,
	ActionType.GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS,
	ActionType.GAIN_2_DOLLARS_PER_STATION,
	ActionType.GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR,
	ActionType.GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL,
])
const CERT_GAINS = new Set([
	ActionType.GAIN_1_CERTIFICATE,
	ActionType.GAIN_2_CERTIFICATES,
	ActionType.MAX_CERTIFICATES,
	ActionType.GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR,
	ActionType.GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL,
])
const DRAW_ACTIONS = new Set([
	ActionType.DRAW_CARD,
	ActionType.DRAW_2_CARDS,
	ActionType.DRAW_3_CARDS,
	ActionType.DRAW_4_CARDS,
	ActionType.DRAW_5_CARDS,
	ActionType.DRAW_6_CARDS,
])
const EXCHANGE_ACTIONS = new Set([ActionType.GAIN_EXCHANGE_TOKEN, ActionType.USE_EXCHANGE_TOKEN])

const liveDollarGains = computed(() => store.actions.filter((a) => DOLLAR_GAINS.has(a)))
const liveCertGains = computed(() => store.actions.filter((a) => CERT_GAINS.has(a)))
const liveDraws = computed(() => store.actions.filter((a) => DRAW_ACTIONS.has(a)))
const liveExchange = computed(() => store.actions.filter((a) => EXCHANGE_ACTIONS.has(a)))
const canCollectDollars = computed(() => actable.value && liveDollarGains.value.length > 0)
const canCollectCerts = computed(() => actable.value && liveCertGains.value.length > 0)
const canDraw = computed(() => actable.value && liveDraws.value.length > 0)
const canUseExchange = computed(() => actable.value && liveExchange.value.length > 0)
const exchangeEdition = computed(() => edition.value === "SECOND" || (game.value?.isRailsToTheNorth() ?? false))

function performLive(actions) {
	if (actions.length === 1) {
		controller.perform({ type: actions[0] })
		return
	}
	if (actions.length > 1) menu.value = actions.map((a) => ({ label: view.humanizeAction(a), run: () => controller.perform({ type: a }) }))
}

function pickMenu(option) {
	menu.value = null
	option.run()
}

function collectDollars() {
	if (actable.value) performLive(liveDollarGains.value)
}
function collectCerts() {
	if (actable.value) performLive(liveCertGains.value)
}
function clickExchange() {
	if (actable.value) performLive(liveExchange.value)
}
function clickDrawPile() {
	if (!actable.value || !liveDraws.value.length) {
		toggleStack("draw")
		return
	}
	performLive(liveDraws.value)
}

function isCattle(card) {
	return card && card.value !== undefined
}

function performCardAction(action, card) {
	switch (action) {
		case ActionType.DISCARD_CARD:
		case ActionType.REMOVE_CARD:
		case ActionType.UPGRADE_SIMMENTAL:
			// These engine actions take the whole card object.
			controller.perform({ type: action, card })
			return
		case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
		case ActionType.PLAY_OBJECTIVE_CARD:
			controller.perform({ type: action, objectiveCard: card })
			return
		default:
			controller.perform({ type: action, cattleType: card.type })
	}
}

function performWrappedCardAction(action, card) {
	if (store.actions.includes(action)) {
		performCardAction(action, card)
		return
	}
	if (!auxWrapper.value) return
	if (!controller.perform({ type: auxWrapper.value })) return
	if (store.actions.includes(action)) performCardAction(action, card)
}

function selectCard(card) {
	const actions = applicableCardActions(card)
	if (!actions.length) return
	if (actions.length === 1) {
		performWrappedCardAction(actions[0], card)
		return
	}
	menu.value = actions.map((a) => ({ label: view.humanizeAction(a), run: () => performWrappedCardAction(a, card) }))
}
</script>

<template>
	<div v-if="ps" id="playerBoard" :style="{ borderColor: color }">
		<div class="header">
			<span class="balance" :class="{ selectable: canCollectDollars }" @click="collectDollars">${{ ps.balance }}</span>
			<span v-if="ps.handValue()">{{ t('row.playerTable.handValue', { value: ps.handValue() }) }}</span>
			<span :class="{ selectable: canCollectCerts }" @click="collectCerts">{{ t('row.playerTable.certs', { temp: ps.tempCertificates, total: ps.tempCertificates + ps.permanentCertificates() }) }}</span>
			<span>{{ t('row.playerTable.engine', { space: store.game?.getRailroadTrack().currentSpace(ps.player) }) }}</span>
		</div>
		<div class="collections">
			<span class="stack" :class="{ drawable: canDraw }" :title="canDraw ? t('row.actionArea.clickHighlighted') : t('row.playerTable.drawPileTitle', { count: drawStackSize })" @click="clickDrawPile">
				<img :src="view.cardBackGreyImage()" alt="" /><b>{{ drawStackSize }}</b><em class="stackLabel">{{ t('app.draw') }}</em>
			</span>
			<span class="stack discard" :title="t('row.playerTable.discardPileTitle', { count: discardSize })" @click="toggleStack('discard')">
				<img :src="view.cardBackGreyImage()" alt="" /><b>{{ discardSize }}</b><em class="stackLabel">{{ t('app.discard') }}</em>
			</span>
			<img v-for="m in collections.masters" :key="'sm' + m.name" class="collect" :src="m.img" :title="view.humanizeAction(m.name)" alt="" />
			<span v-if="exchangeEdition && (collections.exchangeTokens > 0 || canUseExchange)" class="collect exchange" :class="{ selectable: canUseExchange }" :title="t('row.popover.exchangeTokens')" @click="clickExchange">
				<img :src="view.exchangeTokenImage()" alt="" /><b>{{ collections.exchangeTokens }}</b>
			</span>
			<img v-for="(h, i) in collections.hazards" :key="'hz' + i" class="collect" :src="h.img" :title="h.label" alt="" />
			<img v-for="(tp, i) in collections.teepees" :key="'tp' + i" class="collect" :src="tp.img" :title="tp.label" alt="" />
			<img v-if="collections.token" class="collect" :src="view.jobMarketTokenImage()" :title="t('row.playerTable.jobMarketToken')" alt="" />
		</div>
		<div class="hand">
			<template v-if="!readonly">
				<CardView
					v-for="(card, i) in hand"
					:key="i"
					class="handCard"
					:class="{ selectable: canSelectCard(card), pair: pairToDiscard.has(i), dimmed: !!store.selectedAction && !canSelectCard(card) }"
					:card="card"
					:tabindex="canSelectCard(card) ? 0 : undefined"
					role="button"
					@mouseenter="hoveredCard = i"
					@mouseleave="hoveredCard = null"
					@click="selectCard(card)"
					@keydown.enter.prevent="selectCard(card)"
					@keydown.space.prevent="selectCard(card)"
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
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="71" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'cowboy') }" :tabindex="workerEligible(i - 1, 'cowboy') ? 0 : undefined" role="button" :aria-label="view.humanizeAction(ActionType.APPOINT_STATION_MASTER)" @click="onWorker('cowboy')" @keydown.enter.prevent="onWorker('cowboy')" @keydown.space.prevent="onWorker('cowboy')" />
			</g>
			<g v-for="i in craftsmen" :key="'k' + i" transform="scale(2.2,2.2)">
				<image :href="view.workerImage('CRAFTSMAN')" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="113" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'craftsman') }" :tabindex="workerEligible(i - 1, 'craftsman') ? 0 : undefined" role="button" :aria-label="view.humanizeAction(ActionType.APPOINT_STATION_MASTER)" @click="onWorker('craftsman')" @keydown.enter.prevent="onWorker('craftsman')" @keydown.space.prevent="onWorker('craftsman')" />
			</g>
			<g v-for="i in engineers" :key="'e' + i" transform="scale(2.2,2.2)">
				<image :href="view.workerImage('ENGINEER')" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" />
				<rect class="worker" :x="122 + (i - 1) * 36.7" y="155" width="33" height="39" rx="6" ry="6" :class="{ selectable: workerEligible(i - 1, 'engineer') }" :tabindex="workerEligible(i - 1, 'engineer') ? 0 : undefined" role="button" :aria-label="view.humanizeAction(ActionType.APPOINT_STATION_MASTER)" @click="onWorker('engineer')" @keydown.enter.prevent="onWorker('engineer')" @keydown.space.prevent="onWorker('engineer')" />
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
				:class="{ selectable: auxRowAvailable(row), disabled: !auxRowAvailable(row) }"
				:tabindex="auxRowAvailable(row) ? 0 : undefined"
				role="button"
				:aria-label="view.humanizeAction(row.action)"
				@click="activateAuxiliaryAction(row)"
				@keydown.enter.prevent="activateAuxiliaryAction(row)"
				@keydown.space.prevent="activateAuxiliaryAction(row)"
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
				:tabindex="discUnlockAction(d) ? 0 : undefined"
				role="button"
				:aria-label="d.u"
				@click="unlock(d)"
				@keydown.enter.prevent="unlock(d)"
				@keydown.space.prevent="unlock(d)"
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
				{{ showStack === "draw" ? t('row.playerTable.drawPileValueOrder') : t('row.playerTable.discardPile') }} ({{ showStack === "draw" ? drawStackSize : discardSize }})
				<button class="actionsLineButton" @click="showStack = null">{{ t('panels.close') }}</button>
			</div>
			<div class="stackDialogCards">
				<CardView v-for="(c, i) in viewedCards" :key="i" :card="c" />
				<span v-if="viewedCards.length === 0" class="empty">{{ t('app.empty') }}</span>
			</div>
		</div>
		<div v-if="menu" class="actionMenu">
			<button v-for="(o, i) in menu" :key="i" class="actionsLineButton" @click="pickMenu(o)">{{ o.label }}</button>
			<button class="actionsLineButton cancel" @click="menu = null">{{ t('panels.cancel') }}</button>
		</div>
	</div>
</template>

<style scoped>
#playerBoard { display: block; width: 100%; margin: 8px 0; box-sizing: border-box; border: 4px solid; border-radius: 8px; padding: 4px; }
.header { margin-bottom: 4px; font-size: 13px; display: flex; gap: 14px; justify-content: center; }
.header .balance { font-weight: bold; color: #0a6c0a; }
.header .selectable { cursor: pointer; outline: 2px solid #ffd400; border-radius: 3px; }
.header .selectable:hover { outline-color: #90ee90; }
.collections { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px; margin-bottom: 4px; min-height: 64px; }
.collections .collect { width: 26px; height: 30px; border: 1px solid #fff; border-radius: 4px; background: #fff; }
.collections .collect.exchange { position: relative; box-sizing: border-box; cursor: default; }
.collections .collect.exchange.selectable { cursor: pointer; border-color: #ffd400; box-shadow: 0 0 0 2px #ffd400; }
.collections .collect.exchange.selectable:hover { border-color: #90ee90; box-shadow: 0 0 0 2px #90ee90; }
.collections .collect.exchange img { width: 100%; height: 100%; display: block; }
.collections .collect.exchange b { position: absolute; right: 1px; bottom: 0; color: #fff; font-size: 12px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
.collections .stack { position: relative; box-sizing: border-box; width: 52px; height: 60px; border: 3px solid #ffd400; border-radius: 4px; overflow: hidden; cursor: pointer; }
.collections .stack:hover { border-color: #90ee90; }
.collections .stack.drawable { box-shadow: 0 0 0 3px #90ee90; }
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
/* Selectable cards are yellow; the mouseover (and the pair a hovered card would
   discard) turns light green, like the board's other clickable targets. */
.handCard.selectable { cursor: pointer; outline: 5px solid #ffd400; }
.handCard.selectable:hover, .handCard.pair { outline: 5px solid #90ee90; }
.handCard.selectable:focus-visible { outline: 5px solid #177daf; }
.handCard.dimmed { opacity: 0.45; }

.stackDialog { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 90; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.stackDialogHead { color: #fff; font-weight: bold; margin-bottom: 8px; }
.stackDialogHead .actionsLineButton { margin: 0 0 0 10px; }
.stackDialogCards { display: flex; flex-wrap: wrap; gap: 4px; max-width: 70vw; max-height: 60vh; overflow-y: auto; background: #fffde8; padding: 8px; border-radius: 6px; }
.stackDialogCards .empty { color: #666; padding: 8px; }

/* One-click card/gain choices: a small board-side menu instead of action-bar buttons. */
.actionMenu {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.35);
	z-index: 95;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 6px;
}
.actionMenu .actionsLineButton { margin: 4px; font-size: 13px; }

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
.action.selectable:focus-visible { stroke: #177daf; stroke-width: 6; }
.action.disabled { stroke: none; }

.disc {
	fill: #b58b6f; /* replaced by color per disc variant below */
	stroke-width: 3;
	cursor: default;
}
.disc.unlocked { display: none; }
.disc.selectable { cursor: pointer; stroke: #ffd400; stroke-width: 4; }
.disc.selectable:hover { stroke: #90ee90; stroke-width: 6; }
.disc.selectable:focus-visible { stroke: #177daf; stroke-width: 6; }
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
.worker.selectable:focus-visible { stroke: #177daf; stroke-width: 3; }

.cowboysRemaining {
	font-size: 32px;
	font-weight: bold;
	fill: white;
	stroke: black;
	stroke-width: 1;
}
</style>
