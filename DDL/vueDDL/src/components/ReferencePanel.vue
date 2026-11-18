// Reference tables: what each good is made from and used for, and which
// spaceyard sits on each starting planet. Read-only; the rules tables in
// DDLreference.js are the single source, so this view cannot drift.
<script setup>
import { computed } from "vue"
import * as rf from "../js/DDLreference.js"
import * as rules from "../js/DDLrules.js"
import * as funcs from "../js/DDLfuncs.js"
import { useModelStore } from "../stores/DDLstore.js"

const store = useModelStore()

function madeBy(goodId) {
	const parts = []
	const fromFactory = rf.factoriesMaking(goodId)
	for (const factory of fromFactory) parts.push(factory.input.map((good) => rf.goodName(good)).join(" + "))
	if (parts.length === 0) parts.push("Mine")
	return parts.join(", ")
}

function usedBy(goodId) {
	const parts = []
	for (const factory of rf.factoriesUsing(goodId)) parts.push(rf.goodName(factory.output))
	const consumer = rf.consumerFor(goodId)
	if (consumer) parts.push(`${consumer.points} vp`)
	return parts.length > 0 ? parts.join(", ") : "—"
}

function tierLabel(good) {
	if (good.tier === 0) return "Mine"
	if (good.tier === 1) return "3 vp"
	return `${good.value} vp`
}

const startingPlanets = computed(() =>
	rf.PLANETS.filter((planet) => planet.start).map((planet) => {
		const state = rules.planetState(store, planet.id)
		const type = state && state.site ? rf.SPACEYARD_TYPES[state.site.tileId] : null
		return {
			id: planet.id,
			name: planet.name,
			mine: state ? state.mine : null,
			gear: type ? rf.gearName(type.gear) : "",
			cost: type ? rf.goodName(type.cost[0]) : "",
			built: !!(state && state.site && state.site.built),
		}
	})
)
</script>

<template>
	<div class="reference">
		<h3>{{ $t("reference.goodsTitle") }}</h3>
		<p class="note">{{ $t("reference.goodsIntro") }}</p>
		<div class="goodsGrid">
			<div v-for="good in rf.GOODS" :key="good.id" class="goodRow">
				<img :src="funcs.goodImage(good.id)" :alt="rf.goodName(good.id)" :title="rf.goodName(good.id)" />
				<div class="goodText">
					<span class="goodName">{{ rf.goodName(good.id) }}</span>
					<span class="goodTier">{{ tierLabel(good) }}</span>
					<span class="goodLine">{{ $t("reference.madeFrom", { source: madeBy(good.id) }) }}</span>
					<span class="goodLine">{{ $t("reference.usedFor", { target: usedBy(good.id) }) }}</span>
				</div>
			</div>
		</div>

		<h3>{{ $t("reference.yardsTitle") }}</h3>
		<p class="note">{{ $t("reference.yardsIntro") }}</p>
		<div class="goodsGrid">
			<div v-for="planet in startingPlanets" :key="planet.id" class="goodRow yardRow">
				<img :src="funcs.goodImage(planet.mine)" :alt="rf.goodName(planet.mine)" :title="rf.goodName(planet.mine)" />
				<div class="goodText">
					<span class="goodName">{{ planet.name }}</span>
					<span class="goodLine">{{ $t("reference.planetMine", { good: rf.goodName(planet.mine) }) }}</span>
					<span class="goodLine">{{ $t("reference.planetYard", { gear: planet.gear, good: planet.cost }) }}</span>
					<span class="goodTier" :class="{ built: planet.built }">{{ planet.built ? $t("reference.yardBuilt") : $t("reference.yardUnbuilt") }}</span>
				</div>
			</div>
		</div>

		<h3>{{ $t("reference.notesTitle") }}</h3>
		<ul class="notes">
			<li>{{ $t("reference.noteHighway") }}</li>
			<li>{{ $t("reference.noteConsumer") }}</li>
			<li>{{ $t("reference.noteUndo") }}</li>
			<li>{{ $t("reference.noteQueue") }}</li>
		</ul>
	</div>
</template>

<style scoped>
.reference { text-align: left; max-width: 1100px; margin: 0 auto 8px auto; }
.reference h3 { margin: 10px 0 2px 0; }
.note { font-size: 11px; color: #333; margin: 0 0 6px 0; }
.goodsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 4px; }
.goodRow { display: flex; align-items: flex-start; gap: 5px; border: 1px solid #9db6cf; border-radius: 4px; background: #f4faff; padding: 3px 4px; }
.goodRow img { width: 28px; height: 28px; object-fit: contain; flex: 0 0 auto; }
.goodText { display: flex; flex-direction: column; min-width: 0; }
.goodName { font-weight: bold; font-size: 12px; }
.goodTier { font-size: 10px; color: #7a4b00; }
.goodTier.built { color: #126b2a; }
.goodLine { font-size: 10px; color: #333; }
.yardRow { background: #fffbe8; }
.notes { margin: 2px 0 6px 18px; padding: 0; font-size: 11px; }
.notes li { margin-bottom: 2px; }
</style>
