<script setup>
import { ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const text = ref(store.notes || "");
const saving = ref(false);
const saved = ref(false);

async function save() {
	if (saving.value) return;
	saving.value = true;
	saved.value = false;
	try {
		await IO.saveNotes(text.value);
		store.notes = text.value;
		saved.value = true;
	} catch {
		store.gameMessages.errorText = "Could not save the notes.";
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<div class="panel notes-panel">
		<h2>Private notes</h2>
		<p class="hint">Only you can see these notes. They are saved with the game.</p>
		<textarea v-model="text" rows="12" maxlength="5000"></textarea>
		<div class="row">
			<button class="action" :disabled="saving" @click="save">Save notes</button>
			<span v-if="saved" class="ok">Saved.</span>
		</div>
	</div>
</template>

<style scoped>
textarea {
	width: 100%;
	font: inherit;
}

.hint {
	font-size: 12px;
	opacity: 0.75;
}

.ok {
	color: #275d02;
	font-size: 13px;
}
</style>
