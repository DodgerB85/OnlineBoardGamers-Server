import { defineStore } from "pinia";
import { reactive, ref } from "vue";

export const useModelStore = defineStore("model", () => {
	const game = ref(null);
	const gameID = ref(0);
	const gameName = ref("");
	// Chosen on the create page and carried in startingOptions; the first client
	// deals the opening position on this board.
	const mapName = ref("default");
	const finishRound = ref(false);
	const playerNames = ref([]);
	const displayNames = ref({});
	const currentPlayers = ref([]);
	const missingPlayers = ref([]);
	const aiSeats = ref([]);
	const latestUpdate = ref(0);
	const finishedGame = ref(false);
	const chatData = ref("");
	const chatMessages = ref([]);
	const notes = ref("");
	const secondsToNextKickout = ref(0);
	const kickoutRequired = ref(0);
	const kickoutVotesData = ref({});
	const kickoutVoteThreshold = ref(0);
	const chatNotification = ref(false);
	const gameMessages = reactive({ errorText: "", successText: "", bugErrorText: "" });
	const viewSettings = reactive({
		showHistory: false,
		showChat: false,
		showNotes: false,
		showBug: false,
		showRewindPanel: false,
		showResignPanel: false,
		mode: "idle",
		selectedColour: null,
		showGameOver: true,
		saving: false,
		boardZoom: 1,
		historyHover: null,
	});
	const selectedSwap = reactive({ R: {}, B: {}, G: {}, K: {} });

	return {
		game,
		gameID,
		gameName,
		mapName,
		finishRound,
		playerNames,
		displayNames,
		currentPlayers,
		missingPlayers,
		aiSeats,
		latestUpdate,
		finishedGame,
		chatData,
		chatMessages,
		notes,
		secondsToNextKickout,
		kickoutRequired,
		kickoutVotesData,
		kickoutVoteThreshold,
		chatNotification,
		gameMessages,
		viewSettings,
		selectedSwap,
	};
});
