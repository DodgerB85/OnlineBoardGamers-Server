<script setup>
import { computed, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as model from "../js/LBRmodel.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const personal = usePersonalStore();
const confirming = ref(false);
const submitting = ref(false);
const dismissed = ref(false);

const visible = computed(
	() =>
		!dismissed.value &&
		personal.pov >= 0 &&
		!personal.trainingGame &&
		store.game &&
		!store.game.gameOver &&
		!store.finishedGame &&
		store.kickoutRequired === 2 &&
		!model.isMyTurn(),
);

const voteText = computed(() => (store.kickoutVoteThreshold > 1 ? `Vote to kick out ${model.actorName()}` : `Kick out ${model.actorName()}`));

async function confirmKickout() {
	submitting.value = true;
	confirming.value = false;
	try {
		await IO.kickout(model.actorUsername());
	} catch (error) {
		store.gameMessages.errorText = error.message || "Could not start the kickout.";
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div v-if="visible" class="kickoutDialog" role="region" aria-label="Kickout">
		<p><b>{{ model.actorName() }}</b> has used their flexi-time and can be removed from the game.</p>
		<p v-if="store.gameMessages.errorText" class="errorText" role="alert">{{ store.gameMessages.errorText }}</p>
		<button v-if="!confirming" type="button" class="actionsLineButton" :disabled="submitting" @click="confirming = true">{{ voteText }}</button>
		<template v-else>
			<p><b>This cannot be undone.</b></p>
			<button type="button" class="actionsLineButton" :disabled="submitting" @click="confirmKickout">{{ submitting ? "Removing..." : `Confirm ${voteText}` }}</button>
		</template>
		<button type="button" class="actionsLineButton" @click="dismissed = true">Not now</button>
	</div>
</template>

<style scoped>
.kickoutDialog {
	max-width: 900px;
	margin: 10px auto;
	padding: 10px;
	border: 2px solid #a85838;
	background: #fff4df;
	text-align: center;
}
.errorText {
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
