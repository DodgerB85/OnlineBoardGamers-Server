<script setup>
import * as model from "../../js/TGZmodel"
import { useModelStore } from "../../stores/TGZstore.js"

const store = useModelStore()

defineProps({
	prefix: { type: String, default: "actionArea" },
	showEshu: { type: Boolean, default: false },
})
</script>

<template>
	<div id="mapInspectorButtonDiv">
		<button @click="model.toggleMapInspector" class="actionsLineButton">
			<span v-if="!store.topMenuViews.mapInspectorMode">{{ $t(prefix + ".enable") }}</span>
			<span v-else>{{ $t(prefix + ".disable") }}</span>
			<br />
			{{ $t(prefix + ".map") }}
			<br />
			{{ $t(prefix + ".inspector") }}
		</button>
		<template v-if="showEshu && store.topMenuViews.mapInspectorMode">
			<br />
			<input type="checkbox" id="mapInspectorEshuCheckbox" v-model="store.topMenuViews.mapInspectorEshu" />
			<label for="mapInspectorEshuCheckbox">{{ $t(prefix + ".useEshu") }}</label>
		</template>
	</div>
</template>

<style scoped>
#mapInspectorButtonDiv {
	display: inline-block;
	vertical-align: middle;
}
</style>
