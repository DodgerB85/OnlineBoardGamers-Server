<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import * as rf from "../js/URRreference"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
defineProps({ change: { type: Object, required: true } })
const store = useModelStore()
const personal = usePersonalStore()
function colour(index) { return personal.getCorrectedColourHex(store.players[index]?.colour) }
function textColour(index) { return personal.getCorrectedTextColourHex(store.players[index]?.colour) }
</script>

<template>
	<div class="leadershipChange"><img :src="assets.getStateOrderImage(change.id)" alt="" /><span>{{ rf.STATE_NAMES[change.id] }} · {{ change.hasEmerged ? $t("stateLeadership.emerged") : change.isActive ? $t("stateLeadership.monarch") : $t("stateLeadership.leaderChanges") }}<small v-if="change.hasEmerged && change.king === null">{{ $t("stateLeadership.noMonarch") }}</small><small v-else-if="!change.hasEmerged"><template v-if="change.previousKing !== null"><PlayerMarker :index="change.previousKing" :name="change.previousName" /><span class="leaderName" :style="{ backgroundColor: colour(change.previousKing), color: textColour(change.previousKing) }">{{ change.previousName }}</span></template><template v-else>{{ $t("stateLeadership.nobody") }}</template> → <template v-if="change.king !== null"><PlayerMarker :index="change.king" :name="change.nextName" /><span class="leaderName" :style="{ backgroundColor: colour(change.king), color: textColour(change.king) }">{{ change.nextName }}</span></template><template v-else>{{ $t("stateLeadership.nobody") }}</template></small></span><span v-if="change.hasEmerged && change.king !== null" class="emergedOwner"><PlayerMarker :index="change.king" :name="change.nextName" /><span class="leaderName" :style="{ backgroundColor: colour(change.king), color: textColour(change.king) }">{{ change.nextName }}</span></span></div>
</template>

<style scoped>
.leadershipChange { display: flex; align-items: center; gap: 7px; margin: 6px 0; padding: 5px 7px; border-left: 3px solid #177daf; background: #edf6fd; text-align: left; font-size: 16px; font-weight: 400; line-height: 1.4; }.leadershipChange > span { min-width: 0; overflow-wrap: anywhere; }.leadershipChange img { width: 25px; height: 25px; flex-shrink: 0; }.leadershipChange small { display: block; margin-top: 2px; font-size: 16px; font-weight: 400; color: #655a42; }
.emergedOwner { display: flex; align-items: center; gap: 5px; margin-left: auto; }
.leaderName { display: inline-block; flex-shrink: 0; white-space: nowrap; color: white; border: 1px solid black; padding: 0 5px; font-size: 0.9em; line-height: 1.4; }
</style>
