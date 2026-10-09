/**
 * The single shared game store for ROW.
 *
 * Holds the engine Game instance plus reactive UI/view state. Functions that
 * operate on the state live in the ROWmodel / ROWcontroller / ROWreplay /
 * ROWplayer modules (mirroring the other games); this file is state + computed
 * accessors + tiny helpers only.
 */
import { defineStore } from "pinia"
import { computed, reactive, ref } from "vue"
import { usePersonalStore } from "./ROWpersonal"
import { ActionType } from "../js/ROWreference"

export const useModelStore = defineStore("store", () => {
	// Bumped after every engine mutation so `computed`s re-evaluate.
	const version = ref(0)

	/**
	 * Deep ref (not shallowRef): the engine is a class instance, and its methods
	 * mutate nested state in place. A deep ref makes those mutations tracked by
	 * Vue so components reading `store.game` re-render after each action.
	 */
	const game = ref(null)

	const viewSettings = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		showRewindPanel: false,
		showReplay: false,
		performingRewind: false,
	})

	const selectedAction = ref(null)
	const pendingBuilding = ref(null)
	/**
	 * Trail spots the player has clicked for the mandatory MOVE, so the move can
	 * be walked one step at a time. Null until they click the first one.
	 */
	const movePlan = ref(null)
	const gameMessages = reactive({ errorText: "", successText: "", bugErrorText: "", rewindErrorText: "" })
	const history = reactive([])
	const chatData = reactive([])

	/** OBG turn number (round-ish), persisted with each save. */
	const turn = ref(1)
	/** True while a save is in flight; blocks duplicate end-turn submissions. */
	const saving = ref(false)
	/** Players the server reports as missing (kicked out / resigned). */
	const missingPlayers = ref([])

	/** Serialized snapshot taken at the start of the current player's turn. */
	const wholeTurnResetData = ref(null)
	/** Snapshot taken before the last action, for single-action undo. */
	const undoSnapshot = ref(null)
	/** The live position saved when entering replay, restored on exit. */
	const liveBeforeReplay = ref(null)

	/** Client-side replay: a snapshot per turn start + the currently viewed frame. */
	const replayFrames = ref([])
	const replayIndex = ref(-1)

	const state = computed(() => {
		version.value
		return game.value?.state ?? null
	})
	const currentPlayer = computed(() => {
		version.value
		return game.value?.currentPlayer ?? null
	})
	const actions = computed(() => {
		version.value
		return game.value ? Array.from(game.value.possibleActions()) : []
	})
	const canSkip = computed(() => {
		version.value
		return game.value?.canSkip() ?? false
	})
	const canUndo = computed(() => {
		version.value
		return !!undoSnapshot.value && (game.value?.canUndo() ?? false)
	})

	function touch() {
		version.value++
	}

	/** Steps clicked so far; empty whenever MOVE is not pending or the plan went stale. */
	const plannedSteps = computed(() => {
		version.value
		const g = game.value
		const plan = movePlan.value
		if (!g || !plan || !actions.value.includes(ActionType.MOVE)) return []
		return g.getTrail().currentLocation(g.currentPlayer) === plan.from ? plan.steps : []
	})

	/** How many of this turn's steps the player may still click. */
	const moveStepsLeft = computed(() => {
		version.value
		const g = game.value
		if (!g || !actions.value.includes(ActionType.MOVE)) return 0
		return Math.max(0, g.getStepLimit() - plannedSteps.value.length)
	})

	function planMove(steps) {
		const g = game.value
		movePlan.value = { from: g ? g.getTrail().currentLocation(g.currentPlayer) : null, steps: [...steps] }
	}

	function clearMovePlan() {
		movePlan.value = null
	}

	function setGame(g) {
		game.value = g
		clearMovePlan()
		touch()
	}

	function getGame() {
		if (!game.value) throw new Error("Game not initialized")
		return game.value
	}

	function selectAction(a) {
		selectedAction.value = selectedAction.value === a ? null : a
		pendingBuilding.value = null
	}

	function pickBuilding(a, building) {
		selectedAction.value = a
		pendingBuilding.value = building
	}

	function clearAction() {
		selectedAction.value = null
		pendingBuilding.value = null
	}

	function clearMessages() {
		gameMessages.errorText = ""
		gameMessages.successText = ""
		gameMessages.bugErrorText = ""
		gameMessages.rewindErrorText = ""
	}

	return {
		version,
		game,
		viewSettings,
		selectedAction,
		pendingBuilding,
		plannedSteps,
		moveStepsLeft,
		gameMessages,
		history,
		chatData,
		turn,
		saving,
		missingPlayers,
		wholeTurnResetData,
		undoSnapshot,
		liveBeforeReplay,
		replayFrames,
		replayIndex,
		state,
		currentPlayer,
		actions,
		canSkip,
		canUndo,
		touch,
		setGame,
		getGame,
		selectAction,
		pickBuilding,
		clearAction,
		planMove,
		clearMovePlan,
		clearMessages,
		personal: usePersonalStore,
	}
})
