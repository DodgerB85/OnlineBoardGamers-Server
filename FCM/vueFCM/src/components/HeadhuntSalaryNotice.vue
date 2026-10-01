<script setup>
import { computed } from "vue"

import * as rf from "../js/FCMreference"
import * as rules from "../js/FCMrules"
import * as view from "../js/FCMview"

const props = defineProps({
	playerIndex: { type: Number, required: true },
})

const salaryEntries = computed(() => {
	if (props.playerIndex < 0) return []
	return rules.effectiveHeadhuntSalaryEntries(props.playerIndex)
})
</script>

<template>
	<section v-if="salaryEntries.length > 0" class="headhuntSalaryNotice" :aria-label="$t('prePhase.jobSwitchSalaryEmployees')">
		<p><b>{{ $t("prePhase.jobSwitchSalaryEmployees") }}</b></p>
		<div class="headhuntSalaryCards">
			<div v-for="(entry, index) in salaryEntries" :key="`${entry.employee}-${entry.cost}-${index}`" class="headhuntSalaryCard">
				<img :src="view.getImage(`emp_${entry.employee}`)" class="headhuntSalaryEmployee" :alt="rf.employeeName(entry.employee)" />
				<div class="headhuntSalaryAmount">{{ $t("prePhase.jobSwitchSalaryAmount", { amount: entry.cost }) }}</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.headhuntSalaryNotice {
	box-sizing: border-box;
	margin: 8px auto 12px;
	padding: 6px 8px 8px;
	border: 2px solid #8b0000;
	border-radius: 8px;
	background-color: lightgoldenrodyellow;
	color: #3b0000;
}

.headhuntSalaryNotice > p {
	margin: 0 0 5px;
}

.headhuntSalaryCards {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8px;
}

.headhuntSalaryCard {
	box-sizing: border-box;
	width: 101px;
	overflow: hidden;
	border: 2px solid #8b0000;
	border-radius: 8px;
	background-color: white;
}

.headhuntSalaryEmployee {
	display: block;
	width: 97px;
	height: 150px;
}

.headhuntSalaryAmount {
	padding: 4px 3px;
	background-color: #8b0000;
	color: white;
	font-size: 13px;
	font-weight: bold;
	line-height: 1.15;
	text-align: center;
}
</style>
