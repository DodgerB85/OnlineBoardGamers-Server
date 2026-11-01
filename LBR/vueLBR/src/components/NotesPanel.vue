<script setup>
import { ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const text = ref(store.notes || "");
const saving = ref(false);
const saved = ref(false);
const error = ref("");

async function save() {
	if (saving.value) return;
	saving.value = true;
	saved.value = false;
	error.value = "";
	try {
		await IO.saveNotes(text.value);
		store.notes = text.value;
		saved.value = true;
	} catch {
		error.value = "Could not save the notes.";
	} finally {
		saving.value = false;
	}
}

function clearNotes() {
	text.value = "";
	save();
}
</script>

<template>
	<div id="notesBox">
		<div class="utilityHeading">
			<h2>Private notes</h2>
			<button type="button" class="utilityClose" @click="store.viewSettings.showNotes = false" aria-label="Close notes">×</button>
		</div>
		<p>Only you can see these notes. They are saved with the game.</p>
		<p v-if="error" class="errorText" role="alert">{{ error }}</p>
		<div><textarea v-model="text" rows="10" maxlength="5000" aria-label="Private notes"></textarea></div>
		<div>
			<button type="button" class="actionsLineButton" :disabled="saving" @click="save">{{ saving ? "Saving..." : "Save" }}</button>
			<button type="button" class="actionsLineButton" :disabled="saving" @click="clearNotes">Clear</button>
			<button type="button" class="actionsLineButton" @click="store.viewSettings.showNotes = false">Close</button>
		</div>
		<p v-if="saved" class="ok" role="status">Saved.</p>
	</div>
</template>

<style scoped>
#notesBox {
	text-align: center;
	margin-bottom: 10px;
	border: 2px solid black;
	background-color: lightblue;
}
#notesBox textarea { width: 90%; max-width: 90%; box-sizing: border-box; }
.utilityHeading { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; }
.utilityHeading h2 { font-size: 22px; }
.utilityHeading button { border: 0; background: none; color: inherit; font-size: 26px; cursor: pointer; padding: 5px; }
.errorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
.ok {
	color: #275d02;
	font-size: 14px;
}
@media (max-width: 1050px) { .utilityHeading button { min-width: 44px; min-height: 44px; box-sizing: border-box; } }
</style>
