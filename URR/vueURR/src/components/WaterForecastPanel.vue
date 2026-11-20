<script setup>
import { computed, reactive, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useModelStore } from "../stores/URRstore.js"
import { useWaterForecastStore } from "../stores/URRwaterForecast.js"
const forecast = useWaterForecastStore()
const store = useModelStore()
const { t } = useI18n()
const amounts = reactive({})
const deciderName = computed(() => forecast.decider === null ? "" : store.players[forecast.decider]?.displayName || t("forecast.anotherPlayer"))
const wetCount = computed(() => forecast.state.wet.length)
const outflow = computed(() => forecast.state.outflow)
const completeText = computed(() => t(wetCount.value === 1 ? "waterPlayback.completeOne" : "waterPlayback.completeMany", { count: wetCount.value, outflow: outflow.value }))
function label(id) { return forecast.state.game?.board.areas.find((area) => area.id === id)?.label || id }
watch(() => forecast.state.choices, (choices) => {
	for (const key of Object.keys(amounts)) delete amounts[key]
	for (const choice of choices) if (choice.kind === "pump") amounts[choice.area] = 1
}, { immediate: true })
function choose(choice) {
	const amount = choice.kind === "pump" ? Number(amounts[choice.area]) : 1
	if (choice.kind === "pump" && (!Number.isInteger(amount) || amount < 1 || amount > (forecast.frame?.water ?? 0))) {
		forecast.state.error = t("forecast.invalidAmount")
		return
	}
	forecast.choose(choice.area, amount)
}
</script>

<template>
	<div class="waterForecastPanel">
		<div class="forecastHeader">
			<b>{{ $t("forecast.title") }}</b>
			<button class="actionsLineButton" @click="forecast.stop()">{{ $t("forecast.close") }}</button>
		</div>
		<p class="hint">{{ $t("forecast.note") }}</p>
		<template v-if="forecast.state.finished">
			<p role="status" class="forecastComplete">{{ completeText }}</p>
		</template>
		<template v-else>
			<p v-if="forecast.frame" class="forecastSource">{{ $t("forecast.waterFrom", { amount: forecast.frame.water, area: label(forecast.frame.area) }) }}</p>
			<p v-if="forecast.decider !== null" :class="forecast.ownDecision ? 'ownDecision' : 'otherDecision'" role="status">
				{{ forecast.ownDecision ? $t("forecast.ownDecision") : $t("forecast.otherDecision", { player: deciderName }) }}
			</p>
			<p v-if="forecast.currentStep" class="forecastEvent" role="status"><CurrencyText :text="forecast.currentStep.text" /></p>
			<p v-if="forecast.state.error" class="error" role="alert"><CurrencyText :text="forecast.state.error" /></p>
			<div v-if="forecast.state.choices.length" class="forecastChoices">
				<div v-for="choice in forecast.state.choices" :key="choice.area" class="forecastChoice">
					<span><b>{{ label(choice.area) }}</b> <small>{{ $t(choice.kind === "pump" ? "forecast.pump" : "forecast.land") }}</small></span>
					<template v-if="choice.kind === 'pump'">
						<input type="number" inputmode="numeric" min="1" :max="forecast.frame?.water ?? 1" step="1" v-model.number="amounts[choice.area]" :aria-label="$t('forecast.amount', { area: label(choice.area) })" />
						<button class="actionsLineButton" @click="choose(choice)">{{ $t("forecast.send") }}</button>
					</template>
					<button v-else class="actionsLineButton" @click="choose(choice)">{{ $t("forecast.irrigate") }}</button>
				</div>
			</div>
			<button v-else-if="forecast.frame" class="actionsLineButton" @click="forecast.advance()">{{ $t("forecast.continueFlow") }}</button>
		</template>
	</div>
</template>

<style scoped>
.waterForecastPanel { font-size: 16px; font-weight: 400; }
.hint { color: #655a42; margin: 4px 0; }
.forecastHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #c4b894; }
.forecastSource { margin: 6px 0; }
.forecastEvent { margin: 6px 0; color: #655a42; }
.ownDecision { margin: 8px 0; padding: 7px 8px; color: #24572b; background: #e3f2e1; border-left: 4px solid #4f8b4c; }
.otherDecision { margin: 8px 0; padding: 7px 8px; color: #6b4a00; background: #fff0c7; border-left: 4px solid #b8860b; }
.forecastComplete { margin: 8px 0; padding: 8px; background: #def5ff; border-left: 4px solid #177daf; }
.forecastChoices { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
.forecastChoice { display: flex; align-items: center; gap: 6px; padding: 6px; border: 1px solid #c4b894; border-radius: 4px; background: #f7f0dd; }
.forecastChoice span { flex: 1; min-width: 0; overflow-wrap: anywhere; }.forecastChoice small { display: block; color: #655a42; }
.forecastChoice input { width: 65px; box-sizing: border-box; min-height: 36px; font: inherit; }
.forecastChoice button { margin: 0; }
.error { color: #a40000; font-weight: bold; }
</style>
