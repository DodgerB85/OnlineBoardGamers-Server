import { defineStore } from "pinia";
import { reactive, ref } from "vue";

export const useModelStore = defineStore("model", () => {
	const game = ref(null);
	const gameID = ref(0);
	const gameName = ref("");
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
	const gameMessages = reactive({ errorText: "", successText: "" });
	const viewSettings = reactive({
		showHistory: false,
		showChat: false,
		showNotes: false,
		mode: "idle",
		selectedColour: null,
		showGameOver: true,
		saving: false,
	});
	const selectedSwap = reactive({ R: 0, B: 0, G: 0, K: 0 });

	return {
		game,
		gameID,
		gameName,
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
