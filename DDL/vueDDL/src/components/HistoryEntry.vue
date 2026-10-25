<script setup>
import * as rf from "../js/DDLreference.js"
import * as view from "../js/DDLview.js"
import { useModelStore } from "../stores/DDLstore.js"
import { useI18n } from "vue-i18n"

const props = defineProps({
	entry: { type: Array, required: true },
	index: { type: Number, required: true },
})
const { t } = useI18n()
const store = useModelStore()

function playerName() {
	return props.entry[1] >= 0 && store.players[props.entry[1]] ? store.players[props.entry[1]].displayName : ""
}

function eventText() {
	const event = props.entry[0]
	const params = props.entry[3] || []
	const turn = props.entry[2] && props.entry[2].gameflow ? props.entry[2].gameflow.turn : ""
	if (event === rf.HIST_NEW_GAME) {
		if (params[0] === "gear") return t("history.newGear")
		if (params[0] === "planet") return t("history.newPlanet")
		return t("history.newGame")
	}
	if (event === rf.HIST_ENERGY) {
		const colour = view.energyLabel(params[0])
		return t(params[2] ? "history.energyShortage" : "history.energy", { count: params[1] || 1, colour })
	}
	if (event === rf.HIST_ACTION_START) return t("history.actionStart", { turn: params[0] || turn })
	if (event === rf.HIST_HIGHWAY) return t("history.highway")
	if (event === rf.HIST_MOVE) return t("history.move")
	if (event === rf.HIST_BUILD) {
		if (params[0] === "factory") return t("history.buildFactory", { factory: rf.factoryName(params[1]), points: params[2] })
		if (params[0] === "site") return params[1] ? t("history.buildSitePoints", { points: params[1] }) : t("history.buildSite")
		if (params[0] === "privilege") {
			const kind = params[1] === "mine" ? t("action.mine") : params[1] === "factory" ? t("action.factory") : t("common.site")
			return t("history.buildPrivilege", { kind })
		}
		return t("history.built")
	}
	if (event === rf.HIST_TRADE) {
		if (params[0] === "mine") return t("history.tradeMine", { good: rf.goodName(params[1]) })
		if (params[0] === "factory") return t("history.tradeFactory", { good: rf.goodName(params[1]) })
		if (params[0] === "consumer") return t("history.tradeConsumer", { points: params[1] })
		if (params[0] === "gear") return t("history.tradeGear", { gear: rf.gearName(params[1]) })
		return t("history.traded")
	}
	if (event === rf.HIST_PATHWAY) return t("history.pathway")
	if (event === rf.HIST_TRADE_OFFER) {
		if (params[0] === "propose") return t("history.offerTo", { player: store.players[params[1]] ? store.players[params[1]].displayName : t("history.anotherPlayer") })
		if (params[0] === "accept") return t("history.acceptTrade")
		return t("history.declineTrade")
	}
	if (event === rf.HIST_END_TURN) return t("history.endTurn")
	if (event === rf.HIST_GAME_END) return t("history.gameEnd")
	if (event === rf.HIST_AUCTION) return t("history.auction")
	return t("history.event", { event })
}
</script>

<template>
	<div class="historyEntry">
		<span v-if="entry[1] >= 0" class="playerName">{{ playerName() }}</span>
		<span class="event">{{ eventText() }}</span>
		<span v-if="entry[2] && entry[2].gameflow" class="turn">{{ $t("history.turn", { turn: entry[2].gameflow.turn }) }}</span>
	</div>
</template>

<style scoped>
.historyEntry { border-bottom: 1px solid #bbb; padding: 3px 6px; font-size: 13px; text-align: left; }
.playerName { font-weight: bold; color: #1b3f6b; margin-right: 5px; }
.event { color: #222; }
.turn { color: #888; margin-left: 6px; font-size: 11px; }
</style>
