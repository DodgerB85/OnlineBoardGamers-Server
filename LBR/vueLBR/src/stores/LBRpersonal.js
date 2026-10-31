import { defineStore } from "pinia";
import { ref } from "vue";

export const usePersonalStore = defineStore("personal", () => {
	const name = ref("");
	const pov = ref(-99);
	const gameID = ref(0);
	const trainingGame = ref(false);
	const learningGame = ref(false);
	const experiencedGame = ref(false);
	const zoom = ref(39);
	const chatNotification = ref(false);
	const isAdmin = ref(false);
	const gameCreationTimestamp = ref(0);
	const selectedSeat = ref(0);

	return {
		name,
		pov,
		gameID,
		trainingGame,
		learningGame,
		experiencedGame,
		zoom,
		chatNotification,
		isAdmin,
		gameCreationTimestamp,
		selectedSeat,
	};
});
