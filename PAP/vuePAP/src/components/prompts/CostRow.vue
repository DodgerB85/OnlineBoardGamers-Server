<script setup>
// A price as registry icons: Crowns, Hype and the rest as pips with numbers, ingredients as one icon per unit.
import { computed } from "vue"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"

const props = defineProps({ cost: { type: Object, required: true } })

const PIP = { crowns: ICONS.cash, hype: ICONS.hype, lockHype: ICONS.lockedHype, reputation: ICONS.reputation, warnings: ICONS.warning }
const units = computed(() => Object.entries(props.cost).filter(([, n]) => n > 0))
</script>

<template>
	<span class="pp-cost">
		<template v-for="[k, n] in units" :key="k">
			<TokenPip v-if="PIP[k]" :icon="PIP[k].art" :value="n" :label="PIP[k].label" />
			<template v-else>
				<ArtIcon v-for="i in n" :key="i" :name="k" :size="18" :label="ICONS.ingredient(k).label" />
			</template>
		</template>
	</span>
</template>
